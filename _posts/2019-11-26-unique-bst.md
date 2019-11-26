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

## Unique Binary Search Trees

[Unique Binary Search Trees](https://leetcode.com/problems/unique-binary-search-trees/) 문제에서 요구하는 건 $[1 \sim n]$의 sequence가 주어졌을 때, 각 element를 사용해서 만들 수 있는 unique BST의 경우의 수를 계산하는 것이다.

별다른 제약 조건이 없기 때문에 단계적으로 time/space complexity를 개선시켜 나가는 문제는 아니다. 실제로 submission 결과를 보더라도 압도적인 running time이나 memory usage를 보이는 사람은 없으며, 거의 모든 submission이 비슷한 running time을 보인다.

### Solution on Unique Binary Search Trees

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

Unique BST는 주어진 sequence의 원소 $i$를 root로 하는 여러 개의 BST로 구성된다고 할 수 있다. 여기서 $i$가 root이고 길이가 $n$일 때 unique BST의 경우의 수 = $F(i,n)$ 라 하고, 단순히 길이가 $n$일 때의 unique BST 경우의 수 = $G(n)$라 하자. 그렇다면 $F(i,n)$은 **left/right subtree에 대한** $G(n)$ 값을 곱해서 구할 수 있으며, 아래와 같은 점화식을 세울 수 있다.

$$F(i, n) = G(i-1) * G(n-i), 1 <= i <= n$$

위 식에서 $G(i-1)$이 left subtree에 해당하며, $G(n-i)$가 right subtree에 해당한다. 두 개의 경우의 수는 서로 독립적이므로, 해당 값을 곱해서 $i$가 root이고 길이가 $n$일 때의 경우의 수를 구할 수 있다.

우리가 최종적으로 구하고자 하는 값은 $G(n)$이다. 이 값은 모든 $i$에 대해 $F(i, n)$를 구한 뒤 모두 더하면 계산할 수 있다.

$$G(n) = F(1,n) + F(2,n) ... + F(n,n)$$

### Time Complexity on Unique BST solution

위 solution의 시간 복잡도는 $O(N^2)$ 이다. 시간 복잡도가 높은 편이라고 할 수 있지만, BST를 실제로 생성하고 이것이 unique한 지 판별하는 형태로 구현한다면 시간 복잡도는 더욱 높아질 것이다.

Naive한 예시를 들어 보자면, 주어진 sequence에 대한 permutation을 만들고 각 원소를 순서대로 tree에 삽입하면 unique BST의 후보 군을 만들 수 있는데, 여기 까지만 해도 $O(N!)$ 이므로 비효율적임을 알 수 있다.

## Unique Binary Search Trees 2

앞선 문제와 비슷한 유형의 문제를 풀어보자. [Unique Binary Search Trees 2](https://leetcode.com/problems/unique-binary-search-trees-ii/) 문제에서 요구하는 건 $[1 \sim n]$의 sequence가 주어졌을 때, 각 element를 사용해서 **가능한 모든 unique BST를 생성**하는 것이다.

앞선 문제와 내용은 동일하지만 원하는 값이 경우의 수에서 unique BST로 변경됐다. 따라서 기존의 점화식은 사용할 수 없다.

### Solution on Unique Binary Search Trees 2

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode(int x) { val = x; }
 * }
 */
class Solution {
    public List<TreeNode> generateTrees(int n) {
        if (n == 0) {
            return new ArrayList<TreeNode>();
        }
        return createSubtree(1, n);
    }
    
    private List<TreeNode> createSubtree(int lo, int hi) {
        List<TreeNode> subtree = new ArrayList<>();
        if (lo > hi) {
            subtree.add(null);
            return subtree;
        }
        // i를 root로 하는 unique BST 생성
        // leftSubTree sequence: 1..(i-1), rightSubTree sequence: (i+1)..n
        for (int i = lo; i <= hi; i++) {
            List<TreeNode> leftSubTree = createSubtree(lo, i - 1);
            List<TreeNode> rightSubTree = createSubtree(i + 1, hi);
            
            // left/right subtree list를 기반으로 하나의 tree를 재 구성
            for (TreeNode left : leftSubTree) {
                for (TreeNode right : rightSubTree) {
                    TreeNode node = new TreeNode(i);
                    node.left = left;
                    node.right = right;
                    subtree.add(node);
                }
            }
        }
        return subtree;
    }
}
```

기존 점화식은 사용할 수 없지만 접근법은 동일하다. 하나의 순증가 수열 $[1 \sim n]$이 주어졌을 때 $i$ 번째 요소 보다 작은 값들은 $[1 \sim i-1]$에 위치하며, $i$ 번째 요소 보다 큰 값들은 $[i+1 \sim n]$에 위치한다. 따라서 $i$가 root일 때의 모든 unique BST는 left subtree $[1 \sim i-1]$와 right subtree $[i+1 \sim n]$의 unique BST를 포함하는 것과 같다. 그리고 모든 $i$에 대해 이 작업을 반복하면 최종적인 답을 도출해 낼 수 있다.

다만 단순 분할 정복을 하기보다는 memoization을 적용하는 게 좋다. Memoization을 적용한 코드는 아래와 같다.

```java
class Solution {
    private List<TreeNode>[][] memo;
    
    public List<TreeNode> generateTrees(int n) {
        if (n == 0) {
            return new ArrayList<TreeNode>();
        }
        memo = new ArrayList[n + 1][n + 1];
        return createSubtree(1, n);
    }
    
    private List<TreeNode> createSubtree(int lo, int hi) {
        List<TreeNode> subtree = new ArrayList<>();

        // i를 root로 하는 unique BST 생성
        // leftSubTree sequence: 1..(i-1), rightSubTree sequence: (i+1)..n
        for (int i = lo; i <= hi; i++) {
            List<TreeNode> leftSubTree;
            List<TreeNode> rightSubTree;
            
            if (lo > i - 1) {
                List<TreeNode> emptySubTree = new ArrayList<TreeNode>();
                emptySubTree.add(null);
                leftSubTree = emptySubTree;
            } else if (memo[lo][i - 1] == null) {
                leftSubTree = createSubtree(lo, i - 1);
                memo[lo][i - 1] = leftSubTree;
            } else {
                leftSubTree = memo[lo][i - 1];
            }
            
            if (i + 1 > hi) {
                List<TreeNode> emptySubTree = new ArrayList<TreeNode>();
                emptySubTree.add(null);
                rightSubTree = emptySubTree;
            } else if (memo[i + 1][hi] == null) {
                rightSubTree = createSubtree(i + 1, hi);
                memo[i + 1][hi] = rightSubTree;
            } else {
                rightSubTree = memo[i + 1][hi];
            }
            
            // left/right subtree list를 기반으로 하나의 tree를 재 구성
            for (TreeNode left : leftSubTree) {
                for (TreeNode right : rightSubTree) {
                    TreeNode node = new TreeNode(i);
                    node.left = left;
                    node.right = right;
                    subtree.add(node);
                }
            }
        }
        return subtree;
    }
}
```

### Time Complexity on Unique BST 2 solution

Memoization을 활용해 동일한 부분 문제를 반복해서 푸는 것을 방지했기 때문에, 중복 없이 $[i \sim j]$($1 <= i,j <= n$)의 unique BST를 생성하는 비용이 곧 시간 복잡도가 된다. ${}_n \mathrm{C}_2 ~= O(n^2)$ 이고, Tree 생성이 최악의 경우 O(N) 이므로, 최종 worst-case time complexity는 $O(n^3)$ 이다.
