

最近在项目中频繁使用 `CompletableFuture` 来处理异步任务，相比传统的 `Future`，它在灵活性和功能上确实强大很多。这篇文章我想详细聊聊 `CompletableFuture` 的优势、异步编排的细节，以及如何在实际场景中应用它，包括有依赖关系和无依赖关系的任务编排、与线程池的交互等内容。希望通过我的实践经验，能让大家对这个工具的使用更有感觉。

## 1. CompletableFuture 相较于传统 Future 的优势

在 Java 中，`Future` 是从 JDK 5 开始引入的异步编程接口，但它有一些明显的局限性。我在使用过程中发现，`Future` 更像是一个“半成品”，功能有限，而 `CompletableFuture`（JDK 8 引入）则像一个全能选手，弥补了这些不足。以下是我总结的几个关键优势：

### 1.1 非阻塞获取结果

`Future` 的 `get()` 方法是阻塞的，想获取结果只能傻傻地等着。如果任务没完成，线程就会被挂起，这在高并发场景下效率很低。`CompletableFuture` 提供了非阻塞的方式，比如 `thenApply()`、`thenAccept()` 等方法，可以在任务完成后自动触发回调，减少线程阻塞。

举个例子，假设我要查询用户信息，传统 `Future` 的写法可能是：

```java
Future<User> future = executor.submit(() -> getUserFromDB(id));
User user = future.get(); // 阻塞等待

Future<User> future = executor.submmit(() -> getUserFromDB(id));
User user = future.get(); // 阻塞等待
```

而用 `CompletableFuture`，我可以这样写：

```java
CompletableFuture.supplyAsync(() -> getUserFromDB(id))
    .thenAccept(user -> System.out.println("Got user: " + user)); // 非阻塞回调
```

这种回调机制让我能更灵活地处理结果，不用干等着。

### 1.2 链式调用与函数式编程

`Future` 的另一个痛点是无法方便地进行任务编排。如果有多个异步任务需要串联或组合，`Future` 的代码会变得很繁琐。`CompletableFuture` 支持链式调用，结合 Lambda 表达式和函数式编程接口，代码简洁且易读。

比如，我想先异步获取用户，再根据用户 ID 异步查询订单，可以这样写：

```java
CompletableFuture.supplyAsync(() -> getUserFromDB(id))
    .thenCompose(user -> CompletableFuture.supplyAsync(() -> getOrdersByUser(user.getId())))
    .thenAccept(orders -> System.out.println("Got orders: " + orders));
```

这种链式调用让我能清晰地表达任务的依赖关系，代码逻辑一目了然。

### 1.3 异常处理

`Future` 对异常的处理很粗糙，只能通过 `get()` 抛出的异常来捕获。而 `CompletableFuture` 提供了 `exceptionally()` 和 `handle()` 方法，能更优雅地处理异常。

比如：

```java
CompletableFuture.supplyAsync(() -> {
    if (true) throw new RuntimeException("Something went wrong!");
    return "Success";
}).exceptionally(ex -> {
    System.out.println("Error: " + ex.getMessage());
    return "Fallback result";
}).thenAccept(System.out::println);
```

这种方式让我在异步任务中也能像同步代码一样方便地处理异常。

### 1.4 任务组合与并行

`CompletableFuture` 提供了强大的任务组合能力，比如 `thenCombine()`、`allOf()`、`anyOf()` 等，可以轻松处理多个异步任务的并行或依赖关系。相比之下，`Future` 完全没有类似功能，只能靠手动管理线程或 `ExecutorService` 来实现。

## 2. 异步编排的细节

`CompletableFuture` 的核心在于它的异步编排能力。它的 API 设计非常贴近函数式编程，提供了多种方法来处理任务的执行顺序、结果传递和异常处理。下面我详细讲讲这些方法的函数式编程类型，以及如何根据任务依赖关系进行编排。

### 2.1 函数式编程类型

`CompletableFuture` 的很多方法都基于 Java 的函数式接口，比如 `Supplier`、`Consumer`、`Function` 等。理解这些接口的输入输出类型，对正确使用 API 至关重要。我整理了几个常用的方法及其对应的函数式接口：

- `runAsync(Runnable)`

  - **函数式接口**：`Runnable`
  - **特点**：没有输入参数，也没有返回值。适合执行不需要返回结果的异步任务。
  - **示例**：

    ```java
    CompletableFuture.runAsync(() -> System.out.println("Task running!"));
    ```

- `supplyAsync(Supplier<T>)`

  - **函数式接口**：`Supplier<T>`
  - **特点**：没有输入参数，返回一个结果 `T`。适合需要返回值的异步任务。
  - **示例**：

    ```java
    CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> "Hello");
    ```

- `thenApply(Function<T, R>)`

  - **函数式接口**：`Function<T, R>`
  - **特点**：接收上一个任务的结果 `T`，返回新的结果 `R`。用于结果转换。
  - **示例**：

    ```java
    CompletableFuture.supplyAsync(() -> "Hello")
        .thenApply(s -> s + " World")
        .thenAccept(System.out::println); // 输出：Hello World
    ```

- `thenAccept(Consumer<T>)`

  - **函数式接口**：`Consumer<T>`
  - **特点**：接收上一个任务的结果 `T`，无返回值。适合处理最终结果。
  - **示例**：

    ```java
    CompletableFuture.supplyAsync(() -> "Hello")
        .thenAccept(System.out::println); // 输出：Hello
    ```

- `thenCompose(Function<T, CompletableFuture<R>>)`

  - **函数式接口**：`Function<T, CompletableFuture<R>>`
  - **特点**：接收上一个任务的结果 `T`，返回一个新的 `CompletableFuture<R>`。用于串联有依赖关系的异步任务。
  - **示例**：

    ```java
    CompletableFuture.supplyAsync(() -> getUser(id))
        .thenCompose(user -> CompletableFuture.supplyAsync(() -> getOrders(user.getId())));
    ```

- `thenCombine(CompletionStage<U>, BiFunction<T, U, R>)`

  - **函数式接口**：`BiFunction<T, U, R>`
  - **特点**：合并两个异步任务的结果 `T` 和 `U`，返回新的结果 `R`。适合处理并行任务的合并。
  - **示例**：

    ```java
    CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> "Hello");
    CompletableFuture<String> future2 = CompletableFuture.supplyAsync(() -> "World");
    future1.thenCombine(future2, (s1, s2) -> s1 + " " + s2)
           .thenAccept(System.out::println); // 输出：Hello World
    ```

### 2.2 有依赖关系的任务编排

当任务之间存在依赖关系时（比如任务 B 需要任务 A 的结果），我通常使用 `thenApply()` 或 `thenCompose()` 来串联任务。两者的区别在于：

- `thenApply()`：用于简单的结果转换，返回的不是 `CompletableFuture`。
- `thenCompose()`：用于串联另一个异步任务，返回的是 `CompletableFuture`。

假设我要先查用户信息，再根据用户 ID 查订单，代码如下：

```java
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> getUserFromDB(id));
CompletableFuture<List<Order>> ordersFuture = userFuture.thenCompose(user -> 
    CompletableFuture.supplyAsync(() -> getOrdersByUser(user.getId()))
);
ordersFuture.thenAccept(orders -> System.out.println("Orders: " + orders));
```

这里 `thenCompose()` 确保了第二个异步任务（查询订单）在第一个任务（查询用户）完成后才开始，很好地表达了依赖关系。

### 2.3 无依赖关系的任务编排

当任务之间没有依赖关系时，我通常会并行执行它们，然后用 `allOf()` 或 `anyOf()` 来等待所有任务或任意一个任务完成。

- `allOf()`：等待所有任务完成，常用于批量异步任务。\
  示例：同时查询用户信息和订单信息：

  ```java
  CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> getUserFromDB(id));
  CompletableFuture<List<Order>> ordersFuture = CompletableFuture.supplyAsync(() -> getOrdersFromDB());
  CompletableFuture<Void> all = CompletableFuture.allOf(userFuture, ordersFuture);
  all.thenRun(() -> {
      User user = userFuture.join();
      List<Order> orders = ordersFuture.join();
      System.out.println("User: " + user + ", Orders: " + orders);
  });
  ```

- `anyOf()`：等待任意一个任务完成，适合需要快速响应的场景。\
  示例：从多个数据源查询用户信息，取最快的结果：

  ```java
  CompletableFuture<User> source1 = CompletableFuture.supplyAsync(() -> getUserFromSource1(id));
  CompletableFuture<User> source2 = CompletableFuture.supplyAsync(() -> getUserFromSource2(id));
  CompletableFuture.anyOf(source1, source2)
      .thenAccept(user -> System.out.println("Got user: " + user));
  ```

### 2.4 与线程池的交互

`CompletableFuture` 默认使用 `ForkJoinPool.commonPool()` 来执行异步任务，但我们也可以通过自定义 `Executor` 来指定线程池，这在生产环境中非常重要。比如，控制线程数量、设置线程优先级等。

自定义线程池的写法如下：

```java
ExecutorService executor = Executors.newFixedThreadPool(4);
CompletableFuture.supplyAsync(() -> getUserFromDB(id), executor)
    .thenApplyAsync(user -> processUser(user), executor)
    .thenAcceptAsync(System.out::println, executor);
```

注意：

- 使用 `thenApplyAsync()` 或 `supplyAsync(Supplier, Executor)` 可以指定线程池。
- 自定义线程池可以避免 `ForkJoinPool` 在高并发场景下的性能问题，比如线程膨胀。
- 记得在程序结束时关闭线程池（`executor.shutdown()`），避免资源泄漏。

## 3. 实际案例：综合编排

为了让大家更直观地理解，我写一个稍微复杂的案例：假设我要开发一个电商系统，需要异步查询用户信息、订单信息和库存信息，然后将结果汇总。用户和订单有依赖关系（订单需要用户 ID），而库存信息独立。

```java
ExecutorService executor = Executors.newFixedThreadPool(4);

CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> {
    System.out.println("Fetching user...");
    return getUserFromDB(1);
}, executor);

CompletableFuture<List<Order>> ordersFuture = userFuture.thenCompose(user -> 
    CompletableFuture.supplyAsync(() -> {
        System.out.println("Fetching orders for user " + user.getId());
        return getOrdersByUser(user.getId());
    }, executor)
);

CompletableFuture<List<Inventory>> inventoryFuture = CompletableFuture.supplyAsync(() -> {
    System.out.println("Fetching inventory...");
    return getInventoryFromDB();
}, executor);

CompletableFuture.allOf(ordersFuture, inventoryFuture).thenRun(() -> {
    List<Order> orders = ordersFuture.join();
    List<Inventory> inventory = inventoryFuture.join();
    System.out.println("Summary: Orders=" + orders + ", Inventory=" + inventory);
});

executor.shutdown();
```

这个例子展示了：

- 有依赖的任务（用户 → 订单）用 `thenCompose()`。
- 无依赖的任务（订单和库存）用 `allOf()` 合并。
- 自定义线程池来控制资源使用。

## 4. 总结

通过这段时间的使用，我觉得 `CompletableFuture` 最大的魅力在于它的灵活性和函数式编程风格。它不仅解决了 `Future` 的阻塞和编排难题，还提供了强大的异常处理和任务组合能力。在实际项目中，无论是串联有依赖的任务，还是并行处理无依赖的任务，它都能让代码更简洁、更高效。

