---
layout: post
published: true
title: gRPC proxy/client load balancing
mathjax: false
featured: true
comments: true
headline: gRPC proxy/client load balancing
categories: gRPC
tags: gRPC, load-balancing
---

![cover-image](/images/taking-notes.jpg)

gRPC는 proxy, client load balancing을 선택해서 사용할 수 있다. 각각의 특징을 확인하여 특정 상황에 적합한 방식을 선택할 수 있도록 하자.

## Proxy load balancing

![grpc-proxy-load-balancing](/images/post_image/grpc-load-balancing/grpc-load-balancing1.png)

Proxy load balancing을 사용한다면 client는 항상 proxy에 RPC 요청을 보내며, proxy는 backend 내에서 이용 가능한 server 중 하나를 선택해 RPC 요청을 분산한다.

장점

- Client는 proxy 하나만 알고 있으면 되므로, proxy를 기준으로 trust boundary가 형성된다. 따라서 client는 backend의 변동을 신경 쓰지 않는다.

단점

- Proxy가 중간에 위치 하면서 network hop이 증가 한다. 또한 모든 요청이 하나의 proxy에 몰리므로, 상황에 따라 proxy의 부하를 분산하는 또 다른 load balancer가 필요하다.

gRPC는 프로토콜 이므로 L4/L7 proxy를 골라서 사용하는 것도 물론 가능하다.

> 이 때 gRPC가 L7에서 HTTP/2로 동작한다는 사실 때문에 **[재밌는 상황]()** 이 발생하기도 한다. 시간이 된다면 꼭 읽어보길 바란다. (*TODO*)

### L4 Load Balancer

L4 부하 분산기는 패킷의 `(Src IP, Dest IP, Port)` 를 기준으로 부하를 분산한다. L4 부하 분산 동작 원리는, client의 패킷이 도달했을 때 해당 패킷의 Dest IP를 NAT로 변환시켜서 적절한 server로 forwarding 하는 방식이다. 역으로 server에서 보낸 패킷을 forwarding할 때는 Src IP를 부하 분산기 자신의 IP 주소로 변경한다.

- Port 번호는 바뀔 수도 있고, 바뀌지 않을 수도 있다.
- 또한 L4 부하 분산기는 VIP(Virtual IP)라는 가상 IP를 사용한다.
- IP address를 사용한다는 점 때문에 'L3/L4 부하 분산기' 라고 부르기도 한다.

L4 부하 분산기의 특징은 다음과 같다

- L7 부하 분산기에 비해, 부하 분산 알고리즘이 훨씬 간단하고 빠르다
- 칩셋의 펌웨어에 부하 분산 알고리즘이 담겨 있는 경우가 있어서, 알고리즘을 입맛에 맞게 변경하기 어려울 수 있다.

### L7 Load Balancer

L7 부하 분산기는 HTTP header를 활용해서 굉장히 다양한 방식으로 부하를 분산한다. 예를 들어 URL, 데이터 타입, 쿠키에 담긴 정보 등을 활용할 수 있다.

- L4 부하 분산기는 (Src IP, Dest IP, Port) 만 사용 가능 한 것과 대조적이다

L7 부하 분산 동작 원리는 L4와 다르게 하나로 정의하기 힘들다. 아래의 L7 부하 분산 예시를 보면 그 이유를 알 수 있다.

- Android/iOS 각각의 client에 맞는 server로 forwarding
- Cookie를 가지고 있는 client는 그 정보에 따라 적합한 server로 forwarding, cookie가 없으면 default server로 forwarding

L7 부하 분산기의 특징은 다음과 같다

- L4 부하 분산기에 비해 알고리즘이 복잡하고 느리다.
- 그러나 L7에서 주어진 정보를 바탕으로 좀 더 '똑똑하게' 부하를 분산하고, server에서 '똑똑하게' 처리한다면, 오히려 L4 부하 분산기 보다 효율적 일 수 있다.

## Client load balancing

![grpc-client-load-balancing](/images/post_image/grpc-load-balancing/grpc-load-balancing2.png)

Client가 이용 가능한 backend 서버를 알고 있다면(IP address, port 등), client가 load balancing 알고리즘을 구현해서 각 요청을 분산시키는 것도 가능하다.

장점

- Proxy가 없기 때문에 추가적인 network hop이 없고, 그 만큼 빠르다.

단점

- '똑똑한' 부하 분산을 위해서는 client가 server의 상태를 주기적으로 체크해야 한다.

앞서 언급된 것처럼 Client load balancing을 위해서는 client가 server의 상태를 체크 해야 한다. gRPC는 2가지 형태의 구현법을 제시하고 있다.

### Thick client

Client가 단독으로 모든 로직을 처리하는 방식이다. 따라서 client는 주기적으로 이용 가능한 서버를 탐색하고, 부하를 확인하며, 적절한 후보군 중 하나의 server를 선택해서 부하를 전달해야 한다.

gRPC는 각 언어마다 library를 제공하여 client load balancing 구현을 최대한 간소화시켰다. 예를 들어 gRPC는 thick client를 위해 다음과 같은 load balancing policy를 제공한다

- pick-first
- round-robin
- weighted-round-robin

Load balancing policy는 Go의 경우 `grpc/balancer` 패키지에서, Java의 경우 `io.grpc.util`, `io.grpc.lb` 패키지에서 관리한다. 이처럼 gRPC가 다양한 언어와 built-in 기능을 제공하지만 단점도 있다.

- 각 언어의 gRPC 구현체가 오픈 소스로 관리되기 때문에, 언어마다 개발 속도 및 내부 구현 디테일이 다를 수 있다.
  - 예를 들어 grpc-java는 `GracefulSwitchLoadBalancer` 라는 걸 제공하지만, grpc-go는 제공하지 않는다.
  - (*TODO*) 구현 디테일을 추후에 확인할 것
- Microservice 환경에서 여러 언어를 함께 사용할 경우, **사용하는 언어마다 thick-client를 구현해야 하는 부담이 있다.**

### Lookaside Load Balancing

![grpc-cliet-load-balancing-lookaside](/images/post_image/grpc-load-balancing/grpc-load-balancing3.png)

Lookaside LB가 주기적으로 서버의 상태를 확인하고, client는 lookaside LB에 선택 가능한 server 목록을 질의하는 방식이다. 실질적인 gRPC request/response는 client와 server가 직접 통신한다.

이 때 client와 lookaside LB간의 통신 또한 gRPC로 이루어지며, 이를 위한 패키지 및 load balancing policy도 제공된다.

- `grpclb` (아직 `EXPERIMENTAL` 단계)
  - (*TODO*) `grpclb`에 대한 디테일은 다른 post에서 정리.
- `xDS`
  - Envoy proxy와 서버를 관리하기 위한 mgmt server를 사용해서 gRPC 부하를 분산하는 방식이다. 엄밀히 얘기하면 gRPC 측에서 언급하는 lookaside LB 방식과 조금 다르다.
    - (*TODO*) xDS도 추후 정리

다만 백엔드의 이용 가능한 server를 탐색하거나, health를 체크하는 건 **개발자가 직접 수행해야 한다.**

Lookaside Load Balancing은 복잡한 로직을 lookaside LB에게 위임했기 때문에 client의 코드가 간결해지는 장점이 있다.

Lookaside LB는 external load balancer, 혹은 one-arm load balancer라고 부르기도 한다.

## Conclusion

gRPC는 proxy/client load balancing을 지원한다. 각각을 선택하는 기준은 크게 performance, trust-boundary이다.

Performance가 중요하다면 client load balancing을 선택하는 것이 좋다. gRPC 통신 과정에 proxy가 관여하지 않으므로 network hop이 하나 줄어든다.

- Lookaside LB를 사용하면 proxy load balancing과 network hop이 동일해지지만, 실제 gRPC message는 client와 server가 직접 주고 받기 때문에 여전히 더 빠르다.

반면에 performance가 조금 떨어지더라도, client와 server간의 trust-boundary가 필요하다면 proxy load balancing을 선택하는 것이 좋다.

## Reference

- [https://grpc.io/blog/loadbalancing/](https://grpc.io/blog/loadbalancing/)
- [https://github.com/grpc/grpc/blob/master/doc/load-balancing.md](https://github.com/grpc/grpc/blob/master/doc/load-balancing.md)
- [https://www.nginx.com/resources/glossary/layer-4-load-balancing/](https://www.nginx.com/resources/glossary/layer-4-load-balancing/)
