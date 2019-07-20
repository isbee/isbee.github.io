---
layout: post
published: true
title: Google Cloud Endpoints에 custom nginx.conf 적용하는 법
mathjax: false
featured: false
comments: true
headline: How to apply custom nginx.conf to Google Cloud Endpoints
categories: Trouble-shooting
tags: Trouble-shooting, Google Cloud, Kubernetes, Nginx
---

![cover-image](/images/taking-notes.jpg)

**잘못된 구글 공식 예제**로 인해 삽질했던 과정을 공유한다.

## 문제 상황

1. Google Cloud Endpoint(GKE)에 custom `nginx.conf`를 적용하려고 했다.
    - 안드로이드 - Endpoint 간 gRPC 통신 과정에서 `FAILED_PRECONDITION: PAYLOAD_TOO_LARGE` 에러가 발생했고, 이것을 해결하려면 `nginx.conf`에 client_max_body_size 값을 바꿔야 했다.
2. 마침 구글에서 custom `nginx.conf`를 적용하는 [공식 예제](https://cloud.google.com/endpoints/docs/grpc/custom-nginx)를 제공했고, 이것을 활용해서 GKE에 배포했다.
    - 해당 예제는 ESP 시작 옵션과 `volume mount`를 활용하여 local의 `nginx.conf`를 도커 컨테이너에 올리는 방식이었다.
3. 그런데 쿠버네티스 pod이 `CrashLoopBackOff`를 일으키며 정상적으로 실행되지 않았다.
4. 문제를 해결하기 위해 구글에서 제시한 `nginx.conf`를 조금씩 수정해서 다양한 테스트를 수행했지만, 계속 실패를 거듭했다.

## 문제 원인

Custom `nginx.conf`를 사용할 경우 ESP 컨테이너 구동시 [start_esp](https://github.com/cloudendpoints/esp/tree/master/start_esp) 스크립트가 실행되지 않으며, 그로인해 endpoints 구성에 필요한 `nginx.config` 파일(server 설정 등을 포함)이 생성되지 않는다.

1. 쿠버네티스 pod이 정상적으로 실행되지 않는 이유는, 도커 컨테이너의 nginx 엔진이 경로 상의 문제로 `nginx.conf`을 읽지 못했거나/ 구글이 제공한 `nginx.conf` 내용이 틀렸기 때문이라 생각했다.
2. 따라서 **정상적으로 동작하는** (custom `nginx.conf`를 적용하기 이전, gRPC는 사용 중) pod/container에 접근해서 `nginx.conf` 내용, 디렉토리 위치 등을 확인했다.
    - `/etc/nginx/nginx.conf`

            # esp 컨테이너에 접근
            user@사용자:~/...$ kubectl exec -it [정상-동작-pod의-esp-컨테이너] --container=esp -- bin/bash
            
            root@정상-동작-pod의-esp-컨테이너:/etc/nginx# ls
            conf.d     fastcgi_params  mime.types                scgi_params                trusted-ca-certificates.crt
            custom     koi-utf         nginx-auto.conf.template  server-auto.conf.template  uwsgi_params
            endpoints  koi-win         nginx.conf                server_config.pb.txt       win-utf
            
            root@정상-동작-pod의-esp-컨테이너:/etc/nginx# cat nginx.conf
            
            ...
    
            http {
                include       /etc/nginx/mime.types;
                default_type  application/octet-stream;
            
                log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                                  '$status $body_bytes_sent "$http_referer" '
                                  '"$http_user_agent" "$http_x_forwarded_for"';
            
                access_log  /var/log/nginx/access.log  main;
            
                sendfile        on;
                #tcp_nopush     on;
            
                keepalive_timeout  65;
            
                #gzip  on;
            
                include /etc/nginx/conf.d/*.conf;
            }
            ```

        **gRPC를 사용 중임에도 `/etc/nginx/nginx.conf`에 관련 내용은 찾아 볼 수 없었고, server 설정에 관한 내용도 없었다.**

        여기서 이상함을 느꼈는데, 이때 `/etc/nginx/endpoints` 폴더가 눈에 들어왔다.

    - `/etc/nginx/endpoints/nginx.conf`

            root@정상-동작-pod의-esp-컨테이너:/etc/nginx/endpoints# ls
            d5b7c75b-3374-5f03-a8f2-45f797213b6d  nginx.conf
            
            root@정상-동작-pod의-esp-컨테이너:/etc/nginx/endpoints# cat nginx.conf 
            # Auto-generated by start_esp
            # Copyright 2017 Google Inc.
            # ...
            
            ...
            
            http {
              include /etc/nginx/mime.types;
              server_tokens off;
              client_max_body_size 32m;
              client_body_buffer_size 128k;
            
              # HTTP subrequests
              endpoints_resolver 8.8.8.8;
              endpoints_certificates /etc/nginx/trusted-ca-certificates.crt;
            
            
              set_real_ip_from  0.0.0.0/0;
              set_real_ip_from  0::/0;
              real_ip_header    X-Forwarded-For;
              real_ip_recursive on;
            
            
              server {
                server_name "";
            
                listen 9000 http2 backlog=16384;
            
                access_log /dev/stdout;
                                             
                location / {
                  # Begin Endpoints v2 Support
                  endpoints {
                    on;
                    server_config /etc/nginx/server_config.pb.txt;
                    metadata_server http://169.254.169.254;
                  }
                  # End Endpoints v2 Support
            
                  # WARNING: only first backend is used
                  grpc_pass 127.0.0.1:8000 override;
                }
            
                include /var/lib/nginx/extra/*.conf;
              }
            
              server {
                # expose /nginx_status and /endpoints_status but on a different port to
                # avoid external visibility / conflicts with the app.
                listen 8090;
                location /nginx_status {
                  stub_status on;
                  access_log off;
                }
                location /endpoints_status {
                  endpoints_status;
                  access_log off;
                }
                location /healthz {
                  return 200;
                  access_log off;
                }
                location / {
                  root /dev/null;
                }
              }
            }

        endpoints 폴더에도 `nginx.conf`가 존재했고 (`start_esp`로 자동 생성된 파일), 이 파일에는 gRPC 관련 내용이 들어있었다.

        결국 endpoint는 이것을 사용해서 nginx를 설정했던 것이었고, 이 파일의 내용은 구글 예제의 `nginx.conf`와 달랐다. (예제가 참 얄궃다...)

3. 다음으로 `CrashLoopBackOff` 이 일어났던 pod/container에 접근했더니 아래와 같은 차이점을 발견할 수 있었다.
    - ESP 시작 옵션에 `-n=/etc/nginx/custom/nginx.conf`를 주는 순간(+ `volumne mount` 사용), `/etc/nginx/endpoints/nginx.config` 가 사라짐

            # nginx.conf가 없다!
            root@CrashLoopBackOff-pod의-esp-컨테이너:/etc/nginx/endpoints# ls
            d5b7c75b-3374-5f03-a8f2-45f797213b6d

        정상적으로 동작했던 pod/container의 `/endpoints` 경로에 존재했던 `nginx.conf` 파일이, 오류가 일어나는 container에는 없었다.

        따라서 없는 파일을 다시 잡아줄 필요가 있었는데, 여러 파일을 사용하는 대신 내가 올리고자 하는 `nginx.conf`로 함께 처리하기로 했다.

## 문제 해결

`start_esp` 로 생성되는 `/etc/nginx/endpoints/nginx.config` 의 내용을 나의 custom `nginx.conf`에 반영하면 더이상 `CrashLoopBackOff`는 발생하지 않았다.

또한 업로드한 custom `nginx.conf`로 `client_max_body_size` 를 변경한 덕분에 gRPC 통신 과정에서 `FAILED_PRECONDITION: PAYLOAD_TOO_LARGE` 에러도 발생하지 않았다.