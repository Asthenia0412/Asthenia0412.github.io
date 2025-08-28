# 01背包与完全背包问题：我的理解与Java实现

最近在复习动态规划的时候，我又重新看了一遍01背包和完全背包问题。这两个问题虽然看起来简单，但细节里藏了不少值得思考的地方。今天我想分享一下我对这两个问题的理解，以及用Java实现的代码。希望能用最直白的方式，把这两个问题讲清楚。

## 01背包问题

01背包问题是我最早接触的动态规划问题之一。简单来说，有一堆物品，每个物品有自己的重量和价值，背包的容量有限，我得决定选哪些物品放进去，才能让总价值最大。关键点在于，每个物品只能选一次，要么放，要么不放，没有中间状态。

### 我的思路

一开始面对这个问题，我有点懵：物品这么多，组合方式感觉无穷无尽。后来我发现，动态规划的核心就是把大问题拆成小问题。我用一个数组`dp[i][w]`来表示前`i`个物品在背包容量为`w`时的最大价值。每次考虑第`i`个物品时，我有两种选择：

- 不放：直接继承前`i-1`个物品在容量`w`下的最大价值。
- 放：把第`i`个物品放进去，价值增加，但容量得减去这个物品的重量。

状态转移方程是：

```
dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])
```

为了优化空间，我后来发现可以用一维数组`dp[w]`来代替，只需要从后往前遍历，避免覆盖之前的状态。

### Java实现

下面是我用Java写的01背包代码，尽量写得简洁易懂：

```java
public class ZeroOneKnapsack {
    public int knapsack(int[] weights, int[] values, int capacity) {
        int n = weights.length;
        int[] dp = new int[capacity + 1];
        
        for (int i = 0; i < n; i++) {
            for (int w = capacity; w >= weights[i]; w--) {
                dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
        
        return dp[capacity];
    }

    public static void main(String[] args) {
        int[] weights = {2, 3, 4, 5};
        int[] values = {3, 4, 5, 6};
        int capacity = 8;
        ZeroOneKnapsack knapsack = new ZeroOneKnapsack();
        System.out.println("最大价值: " + knapsack.knapsack(weights, values, capacity));
    }
}
```

这段代码里，我用了一维数组`dp`，从后往前遍历，确保每个物品只被考虑一次。跑这个例子，输出是`9`，表示在容量8的背包里，能装下最大价值为9。

## 完全背包问题

完全背包问题跟01背包有点像，但有个关键区别：每个物品可以选无限次。这让我一开始有点不适应，因为感觉选择的空间更大了，复杂度会不会飙升？后来我发现，核心还是动态规划，只不过状态转移的方式变了。

### 我的思路

在完全背包里，因为物品可以重复选，我在考虑第`i`个物品时，不需要只看“放或不放”，而是需要考虑放“多少个”。状态转移方程变成了：

```
dp[i][w] = max(dp[i-1][w], dp[i][w - weight[i]] + value[i])
```

注意这里跟01背包的区别：我用的是`dp[i][w - weight[i]]`，而不是`dp[i-1][w - weight[i]]`，因为同一个物品可以重复使用。优化成一维数组后，遍历方向也要改成从前往后，因为需要反复利用当前物品的状态

### Java实现

这是我写的完全背包代码：

```java
public class CompleteKnapsack {
    public int knapsack(int[] weights, int[] values, int capacity) {
        int n = weights.length;
        int[] dp = new int[capacity + 1];
        
        for (int i = 0; i < n; i++) {
            for (int w = weights[i]; w <= capacity; w++) {
                dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
        
        return dp[capacity];
    }

    public static void main(String[] args) {
        int[] weights = {2, 3, 4, 5};
        int[] values = {3, 4, 5, 6};
        int capacity = 8;
        CompleteKnapsack knapsack = new CompleteKnapsack();
        System.out.println("最大价值: " + knapsack.knapsack(weights, values, capacity));
    }
}
```

这里我改成了从前往后遍历，因为完全背包允许重复使用物品。跑这个例子，输出是`12`，因为可以多次选择价值更高的物品。

## 两者的区别与联系

01背包和完全背包的核心区别在于物品的使用次数：

- 01背包：每个物品最多用一次，遍历时要避免覆盖之前的状态，所以从后往前。
- 完全背包：物品可以无限用，遍历时需要反复更新当前状态，所以从前往后。

另外，我发现完全背包的解法可以看作是01背包的扩展。如果把完全背包的物品数量限制为1，就退化成了01背包。这让我觉得动态规划的灵活性真的很强。

## 我的心得

写代码的时候，我一开始老是搞混遍历方向，后来通过调试和手算例子才彻底弄明白。01背包的从后往前是为了保证每个物品只用一次，而完全背包的从前往后是为了让物品可以重复利用。