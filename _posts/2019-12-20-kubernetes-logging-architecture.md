---
layout: post
published: true
title: Kubernetes Logging Architecture
mathjax: false
featured: true
comments: true
headline: Kubernetes Logging Architecture
categories: Kubernetes, Logging
tags: kubernetes, cluster-level-logging, sidecar
---

![cover-image](/images/taking-notes.jpg)

> 이 글은 [Kubernetes 공식 문서](https://kubernetes.io/docs/concepts/cluster-administration/logging/)를 요약 정리한 글임을 알립니다

Kubernetes가 관리하는 Pod/Container은 런타임이기 때문에, 런타임 에러가 발생할 경우 로컬에 저장된 파일이 모두 날라간다. 따라서 로그를 Pod/Container 내부에 남겨서는 안되고 cluster-level-logging이 필요하다.

Cluter-level-logging을 위해서는 로그를 저장/분석/질의 할 수 있는 별개의 backend가 필요하다. 여기서 Kubernetes는 자체적인 solution을 제공하지 않기 때문에, 기존에 존재 하는 logging 시스템을 사용할 필요가 있다.

## Logging at the node level

![node-level-logging](/images/post_image/kubernetes-logging-architecture/node-level-logging.png)

모든 containerized 애플리케이션은 `stdout`, `stderr` 를 container engine의 어딘가로 redirect 한다. 예를 들어 Docker의 경우 [logging driver](https://docs.docker.com/config/containers/logging/configure/)로 redirect 한다.

- Docker의 logging driver는 Kubernetes 환경에서 file을 JSON 형식으로 저장하도록 설정되어 있다.
- Docker JSON logging driver는 각 line을 하나의 message로 판단한다. 만일 multi-line message를 지원하고 싶다면 아래에 소개될 logging agent 방식을 사용하면 된다.

Container가 재시작되는 경우에는 kubelet이 종료된 container 1개의 log를 가지고 있는다(*역주 - Pod이 여러 개의 container를 가지고 있어도, 모두 재시작 되도 1개만 유지하는 듯*). 그러나 Pod이 evicted 되면 모든 container가 evicted 되며, 모든 log가 날라간다.

**Node-level logging에서 중요한 것 중 하나는, 로그가 node의 모든 저장 공간을 차지 않도록 log rotation을 구현하는 것이다. Kubernetes는 log rotation을 직접 지원하기 보다는, 이것을 구현하기 위한 'development tool'을 제공하고 있다.**

- 예를 들어 Kubernetes cluster 내부에는 `kube-up.sh` 스크립트로 배포되는 [logrotate](https://linux.die.net/man/8/logrotate) tool이 존재하며, 이것은 1시간 마다 실행되도록 설정되어 있다.
  - 이 방식은 어떤 환경에서도 사용할 수 있다.
- 또한 Docker `log-opt` 등을 사용해서 container runtime이 자동적으로 log를 rotate 하도록 할 수 있다.
  - GCP의 COS(Container-Optimized OS) image를 사용하면 `kube-up.sh` 이 `log-opt` 를 사용한다.
  - COS를 사용할 때 `kube-up.sh` 이 logging을 어떻게 설정하는지는 이 [script](https://github.com/kubernetes/kubernetes/blob/master/cluster/gce/gci/configure-helper.sh)를 참고하도록 하자
- 2가지의 방식 모두 default로는 10MB를 초과할 때 마다 log rotation이 발생한다

**`kubectl logs` 명령어는 log file을 직접 읽어서 결과를 출력하는데, log rotation이 발생하면 아래와 같은 문제가 발생할 수 있다.**

- 현재 `kubectl logs` 는 최신의 log만 읽기 때문에, 만일 log rotation에 의해 10MB의 log file이 저장되고 0MB의 최신 log file이 생성됬다면, kubectl logs 의 응답은 비어있을 것이다.

### System component logs

System component는 container 위에서 동작하는 것, container 위에서 동작하지 않는 것 2가지로 나뉜다.

- Kubernetes scheduler와 kube-proxy는 container 위에서 동작한다
- kubelet과 container runtime(e.g. Docker)은 container 위에서 동작하지 않는다

어떤 machine이 systemd를 사용한다면, container 외부에서 동작하는 kubelet과 container runtime은 자신의 로그를 systemd-journald에 작성한다. 만약 systemd가 존재하지 않는다면 `.log` 파일을 `/var/log` 경로에 작성한다.

**그러나 container 내부에 존재하는 system component(scheduler, kube-proxy)는 항상 자신의 로그를 `/var/log` 경로에 작성하며, 이것은 기본 logging mechanism을 우회한 것이다.**

- 이 system component 들은 **[klog](https://github.com/kubernetes/klog)** logging 라이브러리를 사용한다.
- [klog - logging convention](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-instrumentation/logging.md)

System component log 또한 log rotation이 필요하다. Container log와 동일하게 `logrotate` 를 사용하지만 하루에 한번, 또는 100MB를 초과했을 때 rotate 한다.

## Cluster-level logging architectures

Kubernetes가 자체적인 cluster-level logging 솔루션을 제공하지는 않기 때문에, 아래와 같은 방식을 사용해 구현하는 것을 고려해보라.

- 모든 node에서 동작하는 node-level logging agent 사용
- Pod 내부에 logging용 sidecar container 추가
- 백엔드로 직접 log 전송

### Using a node logging agent

![node-logging-agent](/images/post_image/kubernetes-logging-architecture/node-logging-agent.png)

Logging agent는 log를 expose 하거나 백엔드로 전송하는 dedicated tool이다. **일반적으로 logging agent는 하나의 node에서 실행되는 모든 container의 로그 경로에 접근할 수 있는 container다.**

Logging agent는 반드시 모든 node에서 실행되어야 하므로, 보통 DaemonSet replica나 manifest pod, 또는 dedicated native process 형태로 구현한다.

- **마지막 2가지 방식은 deprecated 됬으므로, 최대한 DaemonSet replica로 구현하자**

**Node logging agent는 가장 추천되는 kubernetes cluster logging 방식이다. Node 당 1개의 agent만 생성하고, 로그를 남기고자 하는 애플리케이션에 어떠한 변경도 필요로 하지 않기 때문이다.**

- 다만 node-level logging은 애플리케이션의 stdout, stderr 만 기록할 수 있다.

Kubernetes는 별다른 node agent를 특정하지 않았지만, 내부적으로 아래 2가지의 optional logging agent를 패키지로 들고 있다.

- GCP Stackdriver Logging
- Elasticsearch
- 위 2가지 모두 [fluentd](https://www.fluentd.org/)를 사용한다

### Using a sidecar container with the logging agent

Logging용 sidecar container는 아래 2가지 방식으로 사용 가능하다

- 애플리케이션의 로그를 sidecar 자신의 stdout으로 streaming하는 방식
- 애플리케이션의 로그를 가져가는 logging agent

Streaming sidecar container

![streaming-sidecar](/images/post_image/kubernetes-logging-architecture/streaming-sidecar.png)

**Streaming sidecar container는 node logging agent와 함께 사용하기에 좋다.** 기존 node-level logging agent와 분리해서 사용 가능하기 때문에, node-level logging의 장점을 그대로 이어 받으면서 확장 가능하다.

Streaming sidecar container는 **애플리케이션 단독의 stdout, stderr 만으로 구분하기 힘든 로그들을 분리시킬 수 있다.**

- Streaming sidecar가 다시 stdout, stderr을 출력하므로 이를 `kubectl logs` 로 확인하는 것도 가능하다.

예시

    apiVersion: v1
    kind: Pod
    metadata:
      name: counter
    spec:
      containers:
      - name: count
        image: busybox
        args:
        - /bin/sh
        - -c
        - >
          i=0;
          while true;
          do
            echo "$i: $(date)" >> /var/log/1.log;
            echo "$(date) INFO $i" >> /var/log/2.log;
            i=$((i+1));
            sleep 1;
          done
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      - name: count-log-1
        image: busybox
        args: [/bin/sh, -c, 'tail -n+1 -f /var/log/1.log']  # stream 1
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      - name: count-log-2
        image: busybox
        args: [/bin/sh, -c, 'tail -n+1 -f /var/log/2.log']  # stream 2
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        emptyDir: {}
    
    #####################################
    # $ kubectl logs counter count-log-1
    # 0: Mon Jan  1 00:00:00 UTC 2001
    # 1: Mon Jan  1 00:00:01 UTC 2001
    # 2: Mon Jan  1 00:00:02 UTC 2001
    # ...
    
    # $ kubectl logs counter count-log-2
    # Mon Jan  1 00:00:00 UTC 2001 INFO 0
    # Mon Jan  1 00:00:01 UTC 2001 INFO 1
    # Mon Jan  1 00:00:02 UTC 2001 INFO 2
    # ...

다만 streaming sidecar container의 stdout으로 인해 로그가 중복으로 발생하므로, 저장 공간이 부족하다면 이 방식을 사용하지 말아야 한다.

### Sidecar container with a logging agent

![sidecar-without-node-logging-agent](/images/post_image/kubernetes-logging-architecture/sidecar-without-node-logging-agent.png)

만일 node-level logging agent를 사용하기 어렵다면 sidecar를 agent로 사용 하는 방법이 있다. **다만 각 Pod마다 agent를 생성해야 하므로 CPU 등의 자원을 다소 낭비하게 된다.**

이전 파트에서 다룬 것처럼 loggint agent는 Stackdriver 등이 있다. 그러나 fluentd를 사용해서 직접 구현하는 것도 물론 가능하다. 아래의 예시를 보자.

    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: fluentd-config
    data:
      fluentd.conf: |
        <source>
          type tail
          format none
          path /var/log/1.log
          pos_file /var/log/1.log.pos
          tag count.format1
        </source>
    
        <source>
          type tail
          format none
          path /var/log/2.log
          pos_file /var/log/2.log.pos
          tag count.format2
        </source>
    
        <match **>
          type google_cloud
        </match>
    -----------------------------------
    apiVersion: v1
    kind: Pod
    metadata:
      name: counter
    spec:
      containers:
      - name: count
        image: busybox
        args:
        - /bin/sh
        - -c
        - >
          i=0;
          while true;
          do
            echo "$i: $(date)" >> /var/log/1.log;
            echo "$(date) INFO $i" >> /var/log/2.log;
            i=$((i+1));
            sleep 1;
          done
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      - name: count-agent
        image: k8s.gcr.io/fluentd-gcp:1.30
        env:
        - name: FLUENTD_ARGS
          value: -c /etc/fluentd-config/fluentd.conf
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config-volume
          mountPath: /etc/fluentd-config
      volumes:
      - name: varlog
        emptyDir: {}
      - name: config-volume
        configMap:
          name: fluentd-config

### Exposing logs directly from the application

![expose-log-directly](/images/post_image/kubernetes-logging-architecture/expose-log-directly.png)

마지막 방법은 애플리케이션이 로그를 직접 backed로 전달하는 것이다. 이 방법은 Kubernetes scope를 벗어나므로 생략한다.
