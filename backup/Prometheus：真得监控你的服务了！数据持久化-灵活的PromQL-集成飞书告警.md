
作为后端开发，在维护 Spring Boot 单体应用or微服务架构的应用时，经常需要盯着服务的运行状态，尤其是那些涉及增删改操作的接口，TPS（每秒事务数）是个关键指标。Prometheus 是个强大的工具，能帮我把这些接口的性能监控得明明白白。之前看了一些教程，感觉讲得太生硬，像是 AI 吐出来的，所以我决定写一篇正常人能理解的博客，分享我怎么用 Prometheus 监控 TPS，Spring Boot 默认提供的哪些指标值得关注，以及为什么 Actuator 自带的监控不够用，非得上 Prometheus。

## 一、怎么用 Prometheus 监控 TPS

我的服务里有很多增删改接口，比如订单创建、用户信息更新、库存扣减等，每个接口的 TPS 都需要监控。之前我注意到，有些教程建议为每个接口单独写一个 Prometheus 告警规则，但接口一多，这么搞太麻烦了。我找到了一种更省事的办法，通过 Micrometer 和 Prometheus 的标签（labels）功能，统一监控所有接口的 TPS。

### 1. 配置 Spring Boot 和 Micrometer
我在项目里加了 Actuator 和 Micrometer 的依赖，这样 Spring Boot 就能暴露 Prometheus 格式的指标：

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
</dependencies>
```

然后在 `application.yml` 里启用 Prometheus 端点：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "*"
  metrics:
    tags:
      application: my-app
```

这会让 Spring Boot 在 `/actuator/prometheus` 暴露所有指标，Prometheus 可以通过这个端点拉数据。

### 2. 统一监控增删改接口的 TPS
Spring Boot 的 Actuator 默认会为每个 HTTP 接口生成指标，比如 `http_server_requests_seconds_count`，它记录了每个接口的请求次数，带上 `uri`、`method` 和 `status` 等标签。我发现增删改接口通常是 POST、PUT、DELETE 请求(如果你公司的项目真的遵循了RESTFUL风格协议，如果不遵循的话，那你只需要将请求分两类，一类是GET，GET相关数据算出来是QPS、一类是POST，POST就涵盖了增删改，这相关数据算出来的就是TPS)，所以可以用 PromQL 过滤这些方法来计算 TPS，不用为每个接口单独写规则。

我在 Prometheus 的 `rules.yml` 里定义了一个通用的 TPS 告警规则：

```yaml
groups:
- name: api-metrics
  rules:
  - alert: HighTPSTotal
    expr: rate(http_server_requests_seconds_count{method=~"POST|PUT|DELETE"}[5m]) > 50
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "增删改接口 TPS 过高"
      description: "增删改接口的 TPS 超过 50，当前值为 {{ $value }}"
```

这个规则用正则表达式 `method=~"POST|PUT|DELETE"` 匹配所有增删改接口，`rate(...[5m])` 计算 5 分钟内的每秒请求数。如果总 TPS 超过 50 且持续 5 分钟，就会触发告警。

如果我想单独监控某个核心接口（比如订单创建 `/api/order/create`），可以加一个更具体的规则：
需要注意的是：这儿并没有针对一个具体的group创建规则，也就是这条规则只针对一个接口

```yaml
  - alert: HighOrderCreateTPS
    expr: rate(http_server_requests_seconds_count{uri="/api/order/create", method="POST"}[5m]) > 20
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "订单创建接口 TPS 过高"
      description: "订单创建接口 TPS 超过 20，当前值为 {{ $value }}"
```

### 3. 可视化 TPS
我用 Grafana 搭了个仪表盘，展示所有增删改接口的 TPS。PromQL 查询语句是：

```
rate(http_server_requests_seconds_count{method=~"POST|PUT|DELETE"}[5m])
```

在 Grafana 里，我可以按 `uri` 或 `method` 分组，清楚看到每个接口的 TPS 趋势。如果某个接口 TPS 突然飙高，我会重点检查是不是有异常请求或业务高峰。

## 二、Spring Boot 默认提供的常用监控指标

Spring Boot 的 Actuator 结合 Micrometer 提供了很多开箱即用的指标，下面分享一些常见的排查错误的指标：

- **HTTP 请求指标**：
  - `http_server_requests_seconds_count`：请求总数，按 `uri`、`method`、`status` 分类。
  - `http_server_requests_seconds_sum`：请求总耗时，用来算平均响应时间。
  - `http_server_requests_seconds_max`：最大响应时间，排查慢请求很实用。

- **JVM 指标**：
  - `jvm_memory_used_bytes{area="heap"}`：堆内存使用量，排查 OOM 必看。
  - `jvm_gc_pause_seconds`：垃圾回收暂停时间，GC 频繁时会影响性能。
  - `jvm_threads_deadlocked`：死锁线程数，0 正常，非 0 说明有问题。

- **系统指标**：
  - `system_cpu_usage`：系统 CPU 使用率，服务器负载高时要关注。
  - `process_cpu_usage`：应用进程的 CPU 使用率。
  - `disk_free_bytes`：磁盘剩余空间，数据量大时容易爆盘。

- **Tomcat 指标**：
  - `tomcat_sessions_active_current`：活跃会话数，排查用户并发问题。
  - `tomcat_threads_busy`：Tomcat 线程池忙碌线程数，线程不够用时会阻塞请求。

这些指标基本覆盖了排查问题的常见场景。比如有次用户反馈系统卡顿，我在 Grafana 里看到 `jvm_gc_pause_seconds` 异常高，结合 `jvm_memory_used_bytes` 发现堆内存快满了，调整了 JVM 参数后问题解决。

## 三、为什么 Actuator 自带监控不够，非得上 Prometheus？

Spring Boot 的 Actuator 自带了一些监控功能，比如 `/actuator/health` 检查服务健康状态，`/actuator/metrics` 查看指标。但我发现它有几个局限性，单靠 Actuator 完全不够用：

1. **数据持久化差**：
   Actuator 的指标是瞬时快照，存在内存里，重启服务就没了。Prometheus 把数据存成时间序列，我可以查历史趋势，比如看昨天凌晨 TPS 为什么突然飙升。

2. **查询能力弱**：
   Actuator 的 `/actuator/metrics` 只能返回当前值，没法做复杂查询。Prometheus 的 PromQL 超级灵活，比如我可以用 `rate()` 算 TPS，或者 `sum by (uri)` 按接口聚合数据，排查问题效率高得多。

3. **告警功能缺失**：
   Actuator 本身不提供告警机制。如果 TPS 超标或内存爆了，我得自己写代码监控，费时费力。Prometheus 配合 Alertmanager 能自动发告警到飞书、邮箱，还能设置复杂的规则，比如“TPS 连续 5 分钟超 50 才报警”。

4. **可视化支持差**：
   Actuator 的指标只能通过 HTTP 接口看，数据多的时候完全看不过来。Prometheus 配合 Grafana，能把指标画成曲线图、柱状图，问题一目了然。

5. **扩展性不足**：
   我的项目可能不止一个服务，Actuator 没法统一监控多个实例。Prometheus 支持多服务抓取，还能跟 Kubernetes 集成，适合规模化系统。

有次我靠 Actuator 查问题，光看 JSON 数据就花了半小时，还得手动算平均值。后来上了 Prometheus 和 Grafana，5 分钟就能定位问题，这一块提效是巨大的！

## 四、总结

用 Prometheus 监控 Spring Boot 的 TPS，真的帮我省了不少心。通过 Micrometer 和 Actuator，我能轻松捕获所有增删改接口的请求数据，用 PromQL 写个通用规则就能监控总 TPS，核心接口再单独加规则，灵活又省事。Spring Boot 默认的 JVM、HTTP、系统和 Tomcat 指标，基本够我排查大部分问题，尤其是内存、GC 和死锁这些高危点。

真得上Prometheus了，能忍住不上Prometheus、还在做古法手工排障的也是神人了！