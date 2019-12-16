---
layout: post
published: true
title: Bascis of Metaflow
mathjax: false
featured: true
comments: true
headline: Bascis of Metaflow
categories: Data-pipeline
tags: metaflow, data-pipeline
---

![cover-image](/images/taking-notes.jpg)

> 이 글은 [Metaflow 공식 문서](https://docs.metaflow.org/)를 요약 정리한 글임을 알립니다

## The Structure of Metaflow Code

Metaflow는 하나의 프로그램을 여러 operation node를 가진 방향 그래프로 모델링 한다.

이렇게 모델링 된 그래프를 `flow`라고 부르며, 각 operation은 `step` 이라 부른다.

하나의 step은 `start`로 시작해서 `end`로 끝난다.

어떤 node에서 든 start 할 수 있으며, `start`에서 `end`로 끝나는 flow를 `run`이라 한다.

Metaflow는 다음 3가지 transition을 사용해서 그래프를 생성한다

### Linear

![linear](/images/post_image/basics-of-metaflow/linear.png)

    from metaflow import FlowSpec, step
    
    class LinearFlow(FlowSpec):
    
        @step
        def start(self):
            self.my_var = 'hello world'
            self.next(self.a)
    
        @step
        def a(self):
            print('the data artifact is: %s' % self.my_var)
            self.next(self.end)
    
        @step
        def end(self):
            print('the data artifact is still: %s' % self.my_var)
    
    if __name__ == '__main__':
        LinearFlow()

가장 단순한 transition이다. 주목해야 할 부분은 `self.my_var` 변수 이며, 이것을 data artifact라 부른다.

Data artifact는 모든 step에서 유효하므로 꼭 필요한 데이터만 artifact로 선언하도록 한다.

### Branch

![branch](/images/post_image/basics-of-metaflow/branch.png)

    from metaflow import FlowSpec, step
    
    class BranchFlow(FlowSpec):
      
        @step
        def start(self):
            self.next(self.a, self.b)
        
        @step
        def a(self):
            self.x = 1
            self.next(self.join)
        
        @step
        def b(self):
            self.x = 2
            self.next(self.join)
        
        @step
        def join(self, inputs):
            print('a is %s' % inputs.a.x)
            print('b is %s' % inputs.b.x)
            print('total is %d' % sum(input.x for input in inputs))
            self.next(self.end)
        
        @step
        def end(self):
            pass
    
    if __name__ == '__main__':
        BranchFlow()

하나의 run에서 여러 개의 step을 branch 하는 것이 가능하며, branch에서 또 다른 branch를 생성하는 것도 가능하다. **다만 분기된 step 들은 반드시 `join` 돼야 한다.**

`join`은 다른 step과 다르게 함수 parameter를 1개 더 가지며, 이를 통해 분기된 모든 step의 변수에 접근할 수 있다.

### Foreach

![foreach](/images/post_image/basics-of-metaflow/foreach.png)

    from metaflow import FlowSpec, step
    
    class ForeachFlow(FlowSpec):
    
        @step
        def start(self):
            self.titles = ['Stranger Things',
                           'House of Cards',
                           'Narcos']
            self.next(self.a, foreach='titles')  # title 변수에 대해 foreach
        
        @step
        def a(self):
            self.title = '%s processed' % self.input
            self.next(self.join)
        
        @step
        def join(self, inputs):
            self.results = [input.title for input in inputs]
            self.next(self.end)
        
        @step
        def end(self):
            print('\n'.join(self.results))
    
    if __name__ == '__main__':
        ForeachFlow()

`foreach`를 사용하면 list의 각 item에 대해 독립적인 task(혹은 branch)를 생성할 수 있다.

`foreach`로 생성된 모든 task는 병렬적으로 수행되며, 각 task에 주입된 데이터는 `self.input` 으로 접근할 수 있다.

앞선 branch와 마찬가지로, `foreach` 역시 반드시 join 돼야 한다.

### What should be a step

하나의 step은 완전히 성공하거나 혹은 완전히 실패하는 특징을 가진다. **하지만 step이 한번이라도 성공했다면 snapshot이 남기 때문에, 뒤 이은 step들이 실패하더라도 성공한 step은 다시 실행하지 않아도 된다.**

따라서 step은 **checkpoint**의 역할을 하며, 이런 기능이 필요한 로직 단위로 step을 생성하면 된다.

Step은 중간 결과를 확인하거나 실패한 run을 resume 하는데도 사용할 수 있다.

Step을 많이 생성해서 flow가 복잡하다면? 아래 명령어로 전체 그래프를 손쉽게 확인할 수 있다

    $ python myflow.py show

### Parameter

    # Scalar parameter
    from metaflow import FlowSpec, Parameter, step
    
    class ParameterFlow(FlowSpec):
        alpha = Parameter('alpha',
                          help='Learning rate',
                          default=0.01)
    
        @step
        def start(self):
            print('alpha is %f' % self.alpha)
            self.next(self.end)
    
        @step
        def end(self):
            print('alpha is still %f' % self.alpha)
    
    if __name__ == '__main__':
        ParameterFlow()
    
    #################
    
    # Json parameter
    from metaflow import FlowSpec, Parameter, step, JSONType
    
    class JSONParameterFlow(FlowSpec):
        gdp = Parameter('gdp',
                        help='Country-GDP Mapping',
                        type=JSONType,
                        default='{"US": 1939}')
    
        country = Parameter('country',
                            help='Choose a country',
                            default='US')
    
        @step
        def start(self):
            print('The GDP of %s is $%dB' % (self.country, self.gdp[self.country]))
            self.next(self.end)
    
        @step
        def end(self):
            pass
    
    if __name__ == '__main__':
        JSONParameterFlow()

Parameter는 data artifact와 동일하게 class variable이다. 다만 data artifact는 특정 시점에 생성이 된다면, parameter는 프로그램 시작 시점 부터 생성된다는 것이 차이점이다.

### Data artifact propagation

    from metaflow import FlowSpec, step
    
    class MergeArtifactsFlow(FlowSpec):
    
        @step
        def start(self):
            self.pass_down = 'a'
            self.next(self.a, self.b)
    
        @step
        def a(self):
            self.common = 5
            self.x = 1
            self.y = 3
            self.from_a = 6
            self.next(self.join)
    
        @step
        def b(self):
            self.common = 5
            self.x = 2
            self.y = 4
            self.next(self.join)
    
        @step
        def join(self, inputs):
            self.x = inputs.a.x
            self.merge_artifacts(inputs, exclude=['y'])
            print('x is %s' % self.x)
            print('pass_down is %s' % self.pass_down)
            print('common is %d' % self.common)
            print('from_a is %d' % self.from_a)
            self.next(self.end)
    
        @step
        def end(self):
            pass
    
    if __name__ == '__main__':
        MergeArtifactsFlow()

Data artifact는 linear transition에 한해 모든 step에서 공유된다는 걸 상기하자. 이러한 artifact 중에 이름이 같지만 value가 다른 것들이 존재할 수 있고, 이것이 모호함을 발생시킬 수 있다.

- 참고로 분기에서 생성된 artifact는 분기 끼리 공유되지 않음

위 코드에서 pass_down, x, y, common, from_a 5개의 data artifact가 어떻게 전파되는 지 살펴보자

- pass_down
  - 특이점 없음. 모든 step에 전파됨
- x
  - 분기된 a,b step에서 동시에 artifact로서 생성됨.
  - 그러나 join할 때 a.x로 resolve했기 때문에, 중복되는 artifact간의 모호함은 없음.
- y
  - 분기된 a,b step에서 동시에 artifact로서 생성됬으며, 따로 resolve하지 않았기에 모호함이 있음.
  - 다만 `merge_artifact(,exlclude=['y])` 를 사용해 y를 전파 대상에서 제외시켰음.
- common
  - 분기된 a,b step에서 동시에 artifact로서 생성됨. **그러나 서로 value가 동일하기 때문에 모호함이 없음.**
    - Metaflow는 [content based deduplication]([https://docs.metaflow.org/internals-of-metaflow/technical-overview#datastore](https://docs.metaflow.org/internals-of-metaflow/technical-overview#datastore))을 사용한다
- from_a
  - a step에서만 생성된 artifact이므로 모호하지 않음.
