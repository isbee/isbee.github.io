---
layout: post
published: true
title: Metaflow's approach on the Data Science Stack
mathjax: false
featured: true
comments: true
headline: Metaflow's approach on the Data Science Stack
categories: Data-pipeline
tags: metaflow, data-pipeline
---

![cover-image](/images/taking-notes.jpg)

> 이 글은 [Metaflow 공식 문서](https://docs.metaflow.org/)를 요약 정리한 글임을 알립니다

## Data Warehouse

Metaflow는 3가지의 데이터 loading/storing 방식을 제공한다.

### Data in Tables

Hive 등으로 정의된 table을 Spark와 같은 query 엔진으로 접근하는, 널리 사용되는 방식으로 데이터를 가져오는 것이 가능하다. 다만 SQL은 대용량 데이터를 다룰 때 performance에 문제가 생기기 쉽다.

Metaflow는 SQL을 사용하지 않고,  `metaflow.S3` 라이브러리를 사용해 Amazon S3로 부터 '직접' 데이터를 pull 하는 기능도 제공한다.

- 이러한 접근으로 인해 SQL query를 통해 데이터를 가져오는 것보다 blazingly fast 하고, (트랜잭션이 없으므로) 병렬 처리에 대한 제약도 없다.
- 그러나 query를 사용하지 않으므로 복잡한 filtering이 어렵다는 단점이 있다. Python 코드로 filtering 하는 방안이 있지만, 당연히 SQL에 비할 바는 아니다.
- 따라서 데이터를 '직접' 가져오는 방식을 선택하고 싶다면, 복잡한 filtering이 발생하지 않도록 사용자의 access pattern에 맞게 각 table을 partition 해야 한다.

Use cases

- 대용량 데이터를 다루며, 많은 모델을 병렬적으로 빌드하는 workflow

### Data in S3

데이터를 JSON 형태로 S3에 저장하는 것도 가능하다. Metaflow는 Python 코드에서 `self` 키워드를 사용하면 해당 데이터는 자동적으로 S3에 저장되며, 모든 pipeline step에서 data artifact로서 접근할 수 있다.

이러한 Metaflow artifact를 다룰 때는 [Client API]([https://docs.metaflow.org/metaflow/client](https://docs.metaflow.org/metaflow/client))를 사용하는 걸 추천한다.

물론 `metaflow.S3` 로 직접 S3에 접근하는 것 역시 가능하다. 보통 써드 파티 시스템의 데이터를 소비하거나, 써드 파티로 데이터를 보낼 때 사용한다.

- 다만 `metaflow.S3` 를 사용하면 직렬화는 스스로 처리해야 한다

`metaflow.S3` 의 장점은 workflow 전방위적으로 활용 가능하며, 다른 곳에서 제공하는 S3용 client 라이브러리 보다 빠르다는 것이다.

- 다만 Metaflow artifact에 비해 비 직관적이고, 메모리를 낭비하며, Metaflow step 간에 데이터를 안정적으로 전송하는데 적절하지 않다.

Use cases

- S3에 있는 파일 데이터를 외부 시스템과 주고 받아야 할 때

### Data in local files

`metaflow.IncludeFile` 같은 라이브러리를 사용하면 local 파일을 workflow에서 다루는 것이 가능하다

## Compute Resources

Metaflow는 easy-to-use tool을 제공하여 개개인의 상황에 맞는 scalable 기능을 지원 한다.

Performance Optimization

- XGboost, Tensorflow, Numba 등을 사용해 성능을 높인다.

Scaling Up

- AWS 환경에서 더 높은 CPU, GPU, Memory 스펙을 사용해 성능을 높인다.

Scaling Out

- AWS Batch로 필요한 만큼의 batch job을 생성 함으로써, 제약 없는 computing power를 제공한다.

> 현재 Metaflow를 활용한 scaling up/out에 대한 문서만 제공하고 있으며, performance optimzation 방법은 아직 제공되지 않고 있다.

### Using AWS Batch

메모리 한도를 초과하는 크기의 데이터를 다뤄야 한다고 하자. 기존에는 이러한 상황이 주어질 경우, 데이터를 batch 단위로 handling 하는 flow를 직접 구현해야 했다.

반면에 Metaflow를 사용하면  `--with batch` 만으로 해결 가능하다

    $ python BigSum.py run
    
    2019-11-29 02:43:39.689 [5/start/21975 (pid 83812)] File "BugSum.py", line 11, in start
    2018-11-29 02:43:39.689 [5/start/21975 (pid 83812)] big_matrix = numpy.random.ranf((80000, 80000))
    2018-11-29 02:43:39.689 [5/start/21975 (pid 83812)] File "mtrand.pyx", line 856, in mtrand.RandomState.random_sample
    2018-11-29 02:43:39.689 [5/start/21975 (pid 83812)] File "mtrand.pyx", line 167, in mtrand.cont0_array
    2018-11-29 02:43:39.689 [5/start/21975 (pid 83812)] MemoryError
    2018-11-29 02:43:39.689 [5/start/21975 (pid 83812)]
    2018-11-29 02:43:39.844 [5/start/21975 (pid 83812)] Task failed.
    2018-11-29 02:43:39.844 Workflow failed.
        Step failure:
        Step start (task-id 21975) failed.
    
    $ python BigSum.py run --with batch
    The sum is 3200003911.795288.
    Computing it took 4497ms.

`--with batch` 를 사용하면 task를 local 환경이 아닌 AWS Batch로 처리한다. 이는 Metaflow step에 `@batch` 데코레이터를 붙이는 것과 동일하다.

- `@batch` 를 사용하면 특정 함수만 batch 작업을 걸 수 있으므로 유용하다

Metaflow을 사용하면 손쉽게 scale up 할 수 있음은 물론, 늘어난 CPU를 기반으로 병렬 처리도 손쉽게 처리할 수 있다.

    from metaflow import FlowSpec, step, batch, parallel_map
    
    class BigSum(FlowSpec):
    
    	# 60GB 메모리, 8개의 CPU 사용
        @batch(memory=60000, cpu=8)
        @step
        def start(self):
            import numpy
            import time
            big_matrix = numpy.random.ranf((80000, 80000))
            t = time.time()
    		# parallel_map을 활용한 병렬 연산
            parts = parallel_map(lambda i: big_matrix[i:i+10000].sum(),
                                 range(0, 80000, 10000))
            self.sum = sum(parts)
            self.took = time.time() - t
            self.next(self.end)
    
        @step
        def end(self):
            print("The sum is %f." % self.sum)
            print("Computing it took %dms." % (self.took * 1000))
    
    if __name__ == '__main__':
        BigSum()

- 주의할 점) Metaflow의 병렬 연산은 항상 AWS Batch 프로세스를 생성한다. 따라서 간단한 연산의 경우 오히려 불필요한 overhead가 발생할 수 있다.

현재 실행중인 batch list를 확인하거나, 삭제하는 것도 간단하다.

    $ python myflow.py batch list
    # You can kill the tasks started by the latest run with
    $ python myflow.py batch kill
    # If you have started multiple runs, you can make sure there are no orphaned tasks still running with
    $ python myflow.py batch list --my-runs
    # If you see multiple runs running, you can cherry-pick a specific job, e.g. 456, to be killed as follows
    $ python myflow.py batch kill --run-id 456
    # If you are working with another person, you can see and kill their tasks related to this flow with
    $ python myflow.py batch kill --user willsmith

생성할 batch job 갯수를 제한하는 것도 간단하다. 예시를 한번 보자.

    self.params = range(1000)
    self.next(self.fanned_out, foreach='params')

위 코드를 `--with batch` 로 실행하면 1000개의 batch job이 생성될 것이고 매우 큰 overhead 이다. 그러나 `--max-num-splits`을 사용하면 batch job 갯수를 제한할 수 있다.

    $ python myflow.py run --max-num-splits 200

물론 병렬 task 갯수도 제한할 수 있다.

    $ python myflow.py run --max-workers 32
