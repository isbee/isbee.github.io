---
layout: post
published: true
title: What is Metaflow
mathjax: false
featured: true
comments: true
headline: What is Metaflow
categories: Data-pipeline
tags: metaflow, data-pipeline
---

![cover-image](/images/taking-notes.jpg)

> 이 글은 [Metaflow 공식 문서](https://docs.metaflow.org/)를 요약 정리한 글임을 알립니다

Netflix가 개발한 Metaflow는, 데이터 사이언티스트/엔지니어가 real-life data science 프로젝트를 만들고 관리하는데 도움을 주는 Python library다.

## Infrastructure Stack for Data Science

Production 환경에서의 data science 프로젝트는 두터운 infrastructure stack을 요구하며, 대체적으로 아래와 같은 layer를 갖춘다.

![data science infrastructure stack](/images/post_image/what-is-metaflow/1.png)

각 layer의 역할은 다음과 같다

1. Data Warehouse
    - 데이터를 저장하며, 필요에 따라 데이터를 read/update/insert 할 수 있음.
    - 예시: 파일을 가지고 있는 폴더, database, data lake.
2. Compute Resources
    - Modeling code를 실행
    - 예시: server, container
3. Job Scheduler
    - 여러 개의 작업 단위를 스케쥴링
    - 예시: pub/sub
4. Architecture
    - 프로젝트 및 코드 구조를 결정
    - 예시: OOP, packaging
5. Versioning
    - 코드, 데이터, 모델의 버전을 관리.
    - 예시: Git
6. Model Operations
    - Production 환경에서 모델 동작에 대한 이슈. DevOps
        - reliability
        - performance monitoring
        - 여러 version의 model을 동시에 지원
    - 예시: Kubernetes, logging
7. Feature Engineering, Model Development
    - 데이터 사이언티스트가 활약하는 layer.

Metaflow를 사용하면 위 stack을 하나로 통일된, 인간 친화적인 방식으로 접근할 수 있다.

Metaflow는 위 stack에서 lower level을 추상화/최적화 하는데 초점을 맞췄다. 따라서 데이터 사이언티스트는 복잡한 infrastructure는 metaflow에게 맡기고, 자신이 친숙한 PyTorch나 Tensorflow를 활용해서 Python 코드를 작성하면 된다.

Metaflow는 기존에 사용되고 있는 infrastructure를 활용해 개발되었고, **특히 AWS와 강결합을 이루고 있다.**

Metaflow가 위 stack을 어떻게 구현했는지 보고 싶다면 아래 post를 읽어보길 바란다.

[Metaflow's approach on the Data Science Stack](https://isbee.github.io/data-pipeline/Metaflows-approach-on-the-Data-Science-Stack)

## The Philosophy of Metaflow

Metaflow는 데이터 사이언티스트가 겪는 practical problem을 다루기 위해 디자인 됐으며, [Netflix culture](https://jobs.netflix.com/culture)에 영감을 받았다.

1. Grounded on common, real-life business-oriented ML use cases
2. Manage entropy with code
3. Fanatic focus on the usability and ergonomics
4. Enable collaboration
5. First-class support for both prototyping and production
6. Straightforward scalability
7. Pragmatic approach to data access and processing
8. Failures are a feature
