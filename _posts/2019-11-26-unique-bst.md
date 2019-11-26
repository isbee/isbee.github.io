---
layout: post
published: true
title: Unique Binary Search Trees
mathjax: true
featured: true
comments: true
headline: Unique BST
categories: Algorithm
tags: Algorithm Dynamic-programming
---

![cover-image](/images/taking-notes.jpg)

## Problem

[Unique Binary Search Trees](https://leetcode.com/problems/unique-binary-search-trees/) 문제에서 요구하는 건 $[1~n]$의 sequence가 주어졌을 때, 각 element를 사용해서 만들 수 있는 Unique BST의 경우의 수를 계산하는 것이다.

별다른 제약 조건이 없기 때문에 단계적으로 time/space complexity를 개선시켜 나가는 문제는 아니다. 실제로 submission 결과를 보더라도 압도적인 running time이나 memory usage를 보이는 사람은 없으며, 거의 모든 submission이 비슷한 running time을 보인다.

## Solution

```java
class Solution {
    public int numTrees(int n) {
        int[] G = new int[n + 1];
        G[0] = 1;
        G[1] = 1;
        for (int i = 2; i <= n; i++) {
            for (int j = 1; j <= i; j++) {
                // F(i, n) = G(i-1) * G(n-i),   1 <= i <= n
                // G(n) = F(1,n) + F(2,n) ... + F(n,n)
                G[i] += G[j - 1] * G[i - j];
            }
        }
        return G[n];
    }
}
```

이 문제는 중복되는 부분 문제가 발생하기 때문에 dynamic programming으로 빠르게 풀어낼 수 있다.

- 예를 들어 $n=2$ 일 때 2개의 unique BST를 생성할 수 있는데(물론 실제로 만들지는 않는다), 해당 BST가 $n=3$ 에서의 계산에 재사용 될 수 있다.
- 또한 $n-1$ 뿐만 아니라 $n-2$, $n-3$, ... 에서 생성한 BST를 재사용 할 수도 있다.

Unique BST는 주어진 sequence의 원소 $i$를 root로 하는 여러 개의 BST로 구성된다고 할 수 있다. 여기서 $i$가 root이고 길이가 $n$일 때의 unique BST의 경우의 수 = $F(i,n)$ 라 하고, 길이가 $n$일 때의 unique BST 경우의 수 = $G(n)$라 하자. 그렇다면 $F(i,n)$은 **left/right subtree에 대한** $G(n)$ 값을 곱해서 구할 수 있으며, 아래와 같은 점화식을 세울 수 있다.

$$F(i, n) = G(i-1) * G(n-i), 1 <= i <= n$$

위 식에서 $G(i-1)$이 left subtree에 해당하며, $G(n-i)$가 right subtree에 해당한다. 두 개의 경우의 수는 서로 독립적이므로 이를 곱해서 $i$가 root이고 길이가 $n$일 때의 경우의 수를 구할 수 있다.

우리가 최종적으로 구하고자 하는 값은 $G(n)$이다. 이 값은 모든 $i$에 대해 $F(i, n)$를 구한 뒤 모두 더하면 계산할 수 있다.

$$G(n) = F(1,n) + F(2,n) ... + F(n,n)$$

## Time Complexity

위 solution의 시간 복잡도는 $O(N^2)$ 이다. 시간 복잡도가 높은 편이라고 할 수 있지만, 실제 BST를 생성하고 이것이 unique한 지 판별하는 형태로 구현한다면 시간 복잡도는 더욱 높아질 것이다. Naive한 예시를 들어 보자면, 주어진 sequence에 대한 permutation을 만들고 각 원소를 순서대로 tree에 삽입하면 unique BST의 후보 군을 만들 수 있는데, 여기 까지만 해도 $O(N!)$ 이므로 비효율적임을 알 수 있다.
