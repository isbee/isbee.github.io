---
layout: post
published: true
title: Metaflow Technical Overview
mathjax: false
featured: true
comments: true
headline: Metaflow Technical Overview
categories: Data-pipeline
tags: metaflow, data-pipeline
---

![cover-image](/images/taking-notes.jpg)

> 이 글은 [Metaflow 공식 문서](https://docs.metaflow.org/)를 요약 정리한 글임을 알립니다

이 글은 Metaflow을 아우르는 기술에 대해 다룬다. 따라서 아래 글을 읽지 않았다면 먼저 읽어볼 것을 추천한다.

[Basics of Metaflow](https://isbee.github.io/data-pipeline/basics-of-metaflow)

Metaflow는 다음 4가지의 핵심 기능을 바탕으로 디자인 됐다

1. Step으로 이루어진 방향 그래프로 workflow를 정의할 수 있도록, highly usable한 API를 제공 (usability)
2. 데이터, 코드, 외부 의존성에 대한 immutable snapshot을 유지하여 다음 step에 활용한다. (reproducibility)
3. Development에서 production에 이르기까지, 다양한 환경에서의 step 실행을 촉진한다. (scalability, production-readiness)
4. 이전 execution에 대한 metadata를 기록하며, 해당 정보에 쉽게 접근할 수 있도록 한다. (usability, reproducibility)

이제 각 기능이 어떻게 구현 됐는지 살펴보자

## Architecture

Metaflow의 high-level 아키텍쳐는 아래와 같다

![Architecture overview](/images/post_image/metaflow-technical-overview/overview.png)

위 diagram에서 빠진 게 있는데, 바로 time-demension에 대한 서술이다. 우리는 개발 lifecycle을 다음 3가지의 분류로 나눠서 설명할 것이다

1. Development-time: 코드가 작성되는 시점
2. Runtime: 코드가 실행되는 시점
3. Result-time: 코드 실행이 완료되는 시점

## Development-Time Components

Metaflow의 development-time 핵심 컨셉은 flow다. Flow는 비즈니스 로직을 usable, scalable하게 표현한다.

### Flow

`Flow`는 실행을 위해 스케쥴 될 수 있는 가장 작은 단위다. 일반적으로 flow는 외부에서 데이터를 가져오고, step을 통해 처리하고, 최종 output을 만들어 낸다.

사용자는 FlowSpec을 상속 함으로 써 flow를 구현할 수 있다.

Flow는 step 뿐만 아니라 paramter, data trigger 같은 속성을 정의할 수 있다.

- [flowspec.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/flowspec.py](https://github.com/Netflix/metaflow/blob/master/metaflow/flowspec.py)) - base class for flows

### Graph

Metaflow는 step의 전환을 방향 그래프(일반적으로 비순환)로 표현한다.

Metaflow는 graph가 정적으로 정의되는 것을 요구한다. 이로 인해 [Meson]([https://medium.com/netflix-techblog/meson-workflow-orchestration-for-netflix-recommendations-fc932625c1d9](https://medium.com/netflix-techblog/meson-workflow-orchestration-for-netflix-recommendations-fc932625c1d9)) 처럼 정적으로 정의된 그래프만 지원하는 'runtime'이, graph를 translate하는 걸 가능하게 한다.

- [graph.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/graph.py](https://github.com/Netflix/metaflow/blob/master/metaflow/graph.py)) - internal representation of the graph
- [lint.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/lint.py](https://github.com/Netflix/metaflow/blob/master/metaflow/lint.py)) - verifies that the graph is valid

### Step

`Step`은 실행을 resume할 수 있는 가장 작은 단위다. Flow class에 `@step` 데코레이터를 달아준 함수가 step이다.

Step은 체크포인트다. Metaflow는 step으로 생성된 데이터의 snapshot을 유지하여, 뒤이은 step의 input으로써 활용한다. **Snapshot이 유지되기 때문에 step이 실패하더라도 이전 step을 재실행 할 필요가 없다.**

- [flowspec.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/flowspec.py](https://github.com/Netflix/metaflow/blob/master/metaflow/flowspec.py)) - steps belong to a flow

### Decorators

Step의 행동은 `decorator`로 수정될 수 있다. 예를 들어 예외를 잡을 수 있고, timeout을 구현할 수 있으며, 필요한 자원을 정의할 수도 있다.

하나의 Step은 다양한 decorator를 가질 수 있으며, 각 decorator는 Python decorator를 기반으로 구현되었다.

- [decorators.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/decorators.py](https://github.com/Netflix/metaflow/blob/master/metaflow/decorators.py)) - base class for decorators
- [plugins]([https://github.com/Netflix/metaflow/tree/master/metaflow/plugins](https://github.com/Netflix/metaflow/tree/master/metaflow/plugins)) - see various plugins for actual decorator implementations

### Step Code

`Step code`는 step의 body에 해당한다. Step code에는 여러가지 프로그래밍 언어가 사용될 수 있으며, 이외에 Metaflow의 핵심 기능은 Python으로 구현된다.

- 현재는 R 정도만 지원하는 듯

Step code에서 사용되는 모든 instance 변수(`self.x` 같은)는 data artifact로서 유지된다. 반면에 stack 변수(`x` 같은)는 유지되지 않는다.

- [helloworld.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/tutorials/00-helloworld/helloworld.py](https://github.com/Netflix/metaflow/blob/master/metaflow/tutorials/00-helloworld/helloworld.py)) - example of a user-defined flow

## Runtime Components

Metaflow의 runtime 핵심 컨셉은 `run`이다. Run은 유저가 정의한 flow의 실행을 의미한다.

Metaflow는 같은 코드가 노트북과 같은 development 환경이든, production-ready 환경이든 runnable 하도록 만들었다.

- **Metaflow는 runtime 환경에 독립적이다.**

또한 Metaflow는 똑같은 코드가 노트북에서 병렬적으로 실행되거나, 클라우드에서 여러 개의 batch job으로 실행되는 scalability를 제공한다.

### Task

Step은 runtime에서 `task`로서 동작한다. 일반적으로 1개의 step은 1개의 task를 발생시키지만, foreach step의 경우 여러 개의 task가 발생할 수 있다.

- [task.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/task.py](https://github.com/Netflix/metaflow/blob/master/metaflow/task.py)) - manages execution of a task

### Code Package

Metaflow가 run의 결과를 재생산 할 수 있도록 하려면, 실행 됐던 코드에 대한 snapshot이 필요하다.

`Code package`는 시작된 run과 관련된 코드의 immutable snapshot 이며, working directory 내에 존재하는 `datastore` 안에 저장된다.

이러한 snapshot은 cloud 환경에서 일종의 코드 분산 매커니즘으로도 동작한다.

- [package.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/package.py](https://github.com/Netflix/metaflow/blob/master/metaflow/package.py)) - code package implementation

### Environment

Working directory 내에 flow 코드를 snapshot 하는 것 만으로는 reproducibility가 충분하지 않다. 예를 들어  코드가 외부 의존성을 가지고 있다면, 이것 또한 snapshot 해야 한다.

Environment는 flow 코드와 외부 의존성을 캡슐화 해서, 다른 시스템에서도 동일한 실행 환경이 재생산 되도록 한다.

- [environment.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/environment.py](https://github.com/Netflix/metaflow/blob/master/metaflow/environment.py)) - environment base class

> 그렇다면 Code Package와 Environment가 snapshot 하는 'flow code'는 어떤 차이가 있을까?

### Runtime

Flow는 step으로 정의된 task를 topological 순서로 실행한다. Runtime은 이런 run을 orchestrate한다. 따라서 'runtime'은 일종의 scheduler다.

Metaflow는 task를 독립적인 process로 실행하는 built-in runtime을 가지고 있다. 그러나 이것은 production 환경의 scheduler로 동작하는 걸 기대한 runtime은 아니다.

Production run을 위해서는 retry, error reporting, logging을 지원하며 scalable하고 유저 친화적인 UI를 가지고 있는 runtime이 필요하다. 이것이 바로 Netflix의 [Meson]([https://medium.com/netflix-techblog/meson-workflow-orchestration-for-netflix-recommendations-fc932625c1d9](https://medium.com/netflix-techblog/meson-workflow-orchestration-for-netflix-recommendations-fc932625c1d9)) 이다.

- [runtime.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/runtime.py](https://github.com/Netflix/metaflow/blob/master/metaflow/runtime.py)) - local, process-based runtime

### Datastore

Metaflow는 code snapshot과 data artifact를 유지할 수 있는 object store를 필요로 한다.

이 `datastore`는 Metaflow 코드를 실행하는 모든 환경에서 접근 가능해야 한다. 이런 점에서 Amazon S3가 최적의 솔루션이다.

- Metaflow는 local disk를 datastore로 사용하는 것도 가능하다. 보통 development 단계에서 활용된다.

Datastore는 content-addressed storage로 사용된다. **코드와 데이터 모두 content에 대한 hash 값으로 표현되며, 따라서 데이터의 복사본으로 인해 발생할 수 있는 중복은 자동적으로 제거된다.**

**다만 이런 deduplication의 scope는 같은 flow로 한정되어 있다. 따라서 다른 flow의 데이터는 중복이 제거되지 않을 수 있다.**

- [datastore.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/datastore/datastore.py](https://github.com/Netflix/metaflow/blob/master/metaflow/datastore/datastore.py)) - base class for datastore
- [s3.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/datastore/s3.py](https://github.com/Netflix/metaflow/blob/master/metaflow/datastore/s3.py)) - default s3 datastore

### Metadata provider

중앙 집중화 된 `metadata provider` 는 run 들을 track한다. 엄밀히 말하면 Metaflow에 이 기능은 필요 없지만, 이것이 사용됨으로써 시스템이 더 usable 해진다.

Metadata provider는 각 run의 data artifact와 metadata가 `result-time`에 좀 더 발견되기 쉽도록 한다.

- [metadata.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/metadata/metadata.py](https://github.com/Netflix/metaflow/blob/master/metaflow/metadata/metadata.py)) - base class for metadata providers
- [service.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/metadata/service.py](https://github.com/Netflix/metaflow/blob/master/metaflow/metadata/service.py)) - default implementation of the metadata provider
- [local.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/metadata/local.py](https://github.com/Netflix/metaflow/blob/master/metaflow/metadata/local.py)) - local implementation of the metadata provider

## Result-time Components

Metaflow는 run의 결과를 소비할 수 있는 다양한 방식을 제공한다

- `Hive` table에 write되어 다른 시스템에서 활용
- `Jupyter notebook`으로 접근 하여 추가적인 분석 수행

### Metaflow Client

Metaflow는 Python API인 `metaflow.client`를 통해 이전 run의 결과에 접근할 수 있도록 한다.

예를 들어  `metaflow.client`를 사용하면 Jupyter notebook에서 이전 run의 data artifact에 접근할 수 있다. 이런 기능은 production run의 내부 상태를 들여다 보거나, 추가적인 ad-hoc 분석을 수행하는데 유용할 수 있다.

- [metaflow.client]([https://github.com/Netflix/metaflow/tree/master/metaflow/client](https://github.com/Netflix/metaflow/tree/master/metaflow/client)) - client subpackage
- [core.py]([https://github.com/Netflix/metaflow/blob/master/metaflow/client/core.py](https://github.com/Netflix/metaflow/blob/master/metaflow/client/core.py)) - core objects for the client
