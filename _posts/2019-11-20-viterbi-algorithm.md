---
layout: post
published: true
title: Viterbi Algorithm
mathjax: true
featured: true
comments: true
headline: Introduction of Viterbi algorithm
categories: Algorithm
tags: Algorithm Dynamic-programming Speech-recognition
---

![cover-image](/images/taking-notes.jpg)

## What is Viterbi algorithm

$Viterbi$ 알고리즘은 HMM의 parameter가 주어졌을 때, 특정 observation이 나타날 확률이 가장 높은 state의 sequence($Viterbi \; path$)를 탐색하는 dynamic programming 알고리즘 이다.

- Viterbi 알고리즘은 네트워크 분야의 [convolutional code]([https://en.wikipedia.org/wiki/Convolutional_code](https://en.wikipedia.org/wiki/Convolutional_code))를 decoding 하는데 사용되며, 이외에도 음성 인식 등의 다양한 분야에 사용된다.
- Viterbi 알고리즘을 일반화하면 max-sum(혹은 max-product) 알고리즘 이라고 할 수 있다.

HMM($Hidden \; Markov \; Model$)은 <$Q,Y,\pi,T,E$>의 tuple로 정의되며, 각 parameter는 아래와 같다.

- $Q=\{q_1,q_2,...,q_N\}$ : Hidden states 집합
- $Y=\{y_1,y_2,...,y_M\}$ : Hidden states 집합에서 발생할 수 있는 observation들의 집합
- $\pi=ℝ^N$ : 초기 state가 $q_i$일 확률을 나타내는 initial probability $p(q_i)$의 집합
- $T=ℝ^{N×N}$ : $q_i$에서 $q_j$로 이동 할 확률을 나타내는 transition probability $p(q_j \lvert q_i)$의 집합
  - 즉 transition이란 hiden state에서 hidden state로 변환되는 것을 뜻함
- $E=ℝ^{N×M}$ : $q_i$에서 $y_j$가 발생할 확률을 나타내는 emission probability $p(y_j \lvert q_i)$의 집합
  - 즉 emssion이란 hidden state에서 observation으로 변환되는 것을 뜻함

Viterbi 알고리즘을 사용하면, 주어진 HMM에서 특정 observation이 발생할 확률이 가장 높은 state sequence를 알아낼 수 있다.

- e.g. Speech-To-Text를 HMM으로 치환하면 오디오는 observation sequence이며, 변환 될 text는 hidden state에 해당한다. 여기서 Viterbi 알고리즘의 역할은, 주어진 오디오를 발생 시켰을 확률이 가장 높은 string sequence를 추출해내는 것이다.

## Pseudo-code

```javascript
// O = {o_1, o_2, ..., o_N}, Observation space. 아래 parameter를 설명하기 위해 사용된다
//    Space는 각 observation이 존재한다는 걸 보여주는 것 뿐이고, sequence는 각 observation이 시간 T_n에 실제로 발생해서 데이터로 입력된 것이다.

// S = {s_1, s_2, ..., s_K}, State space.
//     우리의 목표는 (hidden) state sequence를 찾아내는 것이므로, state sequence는 주어지지 않는다.
// π = (π_1, π_2, ..., π_K), Initial probabilities.
//     x_1 == s_i 일때의 확률, P(s_i)
// Y = (y_1, y_2, ..., y_T), Observation sequence.
//     시간 t에 o_i가 발생했다면, t == i 이다.
// A = Transition probability matrix of size N x K
//     A[i][j] = s_i에서 s_j로 전환될 확률, P(s_j | s_i)
// B = Emission probability matrix of size N x K
//     B[i][j] = s_i에서 o_j가 발생할 확률, P(o_j | s_i)
// X = (x_1, x_2, ..., x_T), 가장 확률이 높은 Hidden-state sequence.

function VITERBI(O,S,π,Y,A,B) : X {
  // T1[i][j]: (y_1, y_2, ...,y_j)를 observe하는 가장 확률이 높은 경로가 X = (x_1, x_2, ...,x_j = s_i) 일때, 그 확률을 저장한다.
  // T2[i][j]: (y_1, y_2, ...,y_j)를 observe하는 가장 확률이 높은 경로 X = (x_1, x_2, ...,x_j = s_i) 에서, 마지막 경로에 도달하기 이전 경로 x_{j-1} = s_{k}의 *k를 저장한다*
  initialize T1[1..K][1..T], T2[1..K][1..T]

  // Dynamic programming을 위한 초기화
  for each state i = 1 to K:
    T1[i][1] = π[i] * B[i][Y[1]]   // j == 1 이면 X = (x_1 = s_i) 이고, 이 경로가 발생할 확률은 π[i] * B[i][Y[1]] 다.
    T2[i][1] = 0                   // j == 1 이면 X = (x_1 = s_i) 이고, x_1의 이전의 경로 x_0는 존재하지 않는다 -> 0
  
  // Observation sequence로 부터 hidden-state sequence가 생성되므로,
  // 먼저 Observation을 순서대로 순회하고, 이 때 모든 state에 대해서 각 부분 문제를 dynamic programming으로 해결한다.
  for each observation j = 2 to T:
    for each state i = 1 to K:
      // A[k][i]: 모든 state s_k에 대해, 현재 state s_i로 전환될 확률
      // B[i][Y[j]]: 현재 state s_i에서 o_j를 observe할 확률

      // 이전 observation에서 구해놓은 T1 값을 활용하여 현재 T1 값을 구한다.
      T1[i][j] = max_{k}(T1[k][j-1] * A[k][i] * B[i][Y[j]])  // y_j를 observe하는 가장 확률이 큰 경로가 s_i(= x_j)일 때, 그 확률을 저장한다.
      T2[i][j] = argmax_{k}(T1[k][j-1] * A[k][i])            // y_j를 observe하는 가장 확률이 큰 경로가 s_i(= x_j)일 때, 그 확률을 일으켰던 state의 index(k)를 저장한다.
                                                             // T2를 계산할 때 B를 사용하지 않는 이유는, T1 계산에서 본 것처럼 B에 k를 사용하지 않으며, B는 확률이라 non-negative 하므로, 결과적으로 argmax 계산에 영향을 끼치지 않기 때문이다.
  
  // Z[1..T]: 완성된 T2로 부터 경로를 역추적 하는 pointer. X를 생성하는데 사용된다.
  initialize Z[1..T], X[1..T]

  Z[T] = argmax_{k}(T1[k][T])   // 완성된 T1을 이용해서, 마지막 sequence T를 observe할 확률이 가장 큰 state의 index를 찾는다.
                                // 해당 index는 x_j = s_i 에서의 i이다.
  X[T] = S[Z[T]]                // X의 마지막 경로는 위에서 찾은 s_i가 될 것이다.
  // Z를 사용해 T2에 저장된 state를 역추적해서 경로 X를 뒤에서 부터 완성한다
  for j = T downto 2:
    Z[j-1] = T2[Z[j]][j]        // Z[j]는 x_j = s_i 에서의 i를 가리킨다.
                                // 따라서 T2[Z[j]][j] = T2[i][j] = x_{j-1} = s_k 이고, k를 Z[j-1]에 저장한다.
    X[j-1] = S[Z[j-1]]          // k를 찾았으므로 x_{j-1}을 s_k로 설정한다

  return X
}
```

Viterbi 알고리즘의 코드는 짧은 편이지만, 각 파라미터가 어떤 역할을 하는지 정확하게 이해하지 않으면 코드 또한 이해하기 어렵다. 이해를 돕기 위해 주석을 많이 달았지만 그로 인해 너무 번잡 해진 느낌이 있다. 내용을 요약하면 다음과 같다.

1. Dynamic programming을 통해 아래 2가지의 정보를 전처리 한다.
    - $(state, observation) = (s_i, y_j)$ 쌍에 대해, 가장 확률이 높은 hidden state sequence의 각 원소가 발생할 확률 계산. $T_1$
      - 해당 observation이 일어나야 하므로, s_i로의 transition과 y_j의 emission이 동시에 일어나야 하고, 따라서 각 확률 값을 곱해서 계산.
    - $(state, observation) = (s_i, y_j)$ 쌍에 대해, 가장 확률이 높은 hidden state sequence의 원소를 결정시키는 '이전' state 탐색/저장. $T_2$
2. **각 (state, observation) 쌍에 대해 가장 확률이 높은 hidden state sequence를 완성했지만, 아직 각 observation에 대해 실제로 어떤 state를 선택해야 최적 인지는 알지 못한다. 여러 개의 local optimum은 찾았지만 global optimum은 찾지 못한 것이다.** 이는 $T_1$, $T_2$의 정보를 역추적 하면 구할 수 있다.
    1. 우선 주어진 observation sequence에서 마지막 원소를 observe할 확률이 가장 큰 state를 찾는다. 이는 $T_1$을 통해 알 수 있으며, 해당 state는 hidden state sequence 'global optimum'의 마지막 원소가 될 것이다.
        - 뒤에서 부터는 hidden state sequence 'global optimum'을 그냥 가장 확률이 높은 hidden state sequence로 명칭 한다.
    2. 이제 observation sequence를 역으로 순회한다. (앞서 찾은 state, 현재 observation) 쌍을 형성하고, 이를 $T_2$에 대입하면 hidden state sequence의 원소를 결정시키는 '이전' state를 얻을 수 있다. 해당 state는 가장 확률이 높은 hidden state sequence의 또 다른 원소가 될 것이다.
    3. '이전' state를 가리키는 pointer를 유지하면 (앞서 찾은 state, 현재 observation) 쌍을 계속 형성할 수 있다. 따라서 2.를 반복해 가장 확률이 높은 hidden state sequence를 완성한다.
3. 역추적이 완료되면 주어진 observation sequence에 대응되는 최적의 state sequence, 즉 가장 확률이 높은 hidden state sequence가 결정된다.

아직도 설명이 긴 느낌이 있지만, 큰 번호만 읽으면 Viterbi 알고리즘의 맥락을 보는데 도움이 될 것이라 생각한다.

## Time Complexity

Viterbi 알고리즘의 시간 복잡도는 $O(NK^2)$ 라 할 수 있다. 그러나 $T_1,A,B$가 adjacent list를 통해 graph로 표현된다면, 각 edge를 $O(1)$로 탐색할 수 있으므로 $\lvert E \rvert$번의 순회로 $\operatorname{max}$나 $\operatorname{argmax}$ 연산을 완료할 수 있으며, 이 경우 시간 복잡도는 $O(N*(K+\lvert E \rvert))$이다.

## Reference

- [https://untitledtblog.tistory.com/97](https://untitledtblog.tistory.com/97)
- [https://en.wikipedia.org/wiki/Viterbi_algorithm](https://en.wikipedia.org/wiki/Viterbi_algorithm)
