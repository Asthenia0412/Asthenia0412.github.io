
Prometheus挺好用的，但是想用好，得把配置文件的细节都摸清楚。它的规则文件（Rules）和 PromQL 查询语言让我能灵活定义告警逻辑，监控系统健康。写这篇博客，我想分享 Prometheus 规则文件的层级结构、PromQL 的写法和常见函数、监控的核心参数，以及如何从零搭建一套监控体系，最后再聊聊怎么集成飞书和邮箱告警。

## 一、Prometheus 规则文件的层级结构

Prometheus 的规则文件（通常是 `rules.yml`）定义了告警和预计算逻辑，结构清晰，分层明确。我一般通过 `prometheus.yml` 加载规则文件：

```yaml
rule_files:
  - "rules.yml"
```

`rules.yml` 的层级结构主要包含以下部分：

- **groups**：顶层分组，包含多个规则组，用于组织不同类型的规则，比如按服务或监控类型分组。
- **name**：每个规则组的名称，方便区分，比如 `api-metrics` 或 `system-metrics`。
- **rules**：具体规则列表，每条规则定义一个告警或预计算逻辑。
  - **alert**：告警名称，唯一标识，比如 `HighCPUUsage`。
  - **expr**：PromQL 表达式，用于判断是否触发告警。
  - **for**：告警持续时间，只有当条件持续满足时才触发。
  - **labels**：告警的标签，比如严重性（`severity: critical`）。
  - **annotations**：告警的描述信息，比如 `summary` 和 `description`。

一个典型的 `rules.yml` 示例：

```yaml
groups:
- name: api-metrics
  rules:
  - alert: HighTPS
    expr: rate(http_server_requests_seconds_count[5m]) > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "接口 TPS 过高"
      description: "{{ $labels.instance }} 的 TPS 超过 100，当前值为 {{ $value }}"
- name: system-metrics
  rules:
  - alert: HighCPUUsage
    expr: system_cpu_usage > 0.8
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "CPU 使用率过高"
      description: "{{ $labels.instance }} 的 CPU 使用率超过 80%，当前值为 {{ $value }}"
```

这个结构让我可以按模块管理规则，比如把接口相关的放一个组，系统资源相关的放另一个组，维护起来特别清晰。

## 二、PromQL 怎么写：常见函数与技巧

PromQL 是 Prometheus 的查询语言，灵活得像 SQL 一样好用。我用它来写告警规则、查指标趋势。以下是我常用的函数和写法：

### 1. 常见 PromQL 函数
- **rate()**：计算时间序列的每秒增长率，常用于计数器（Counter）指标，比如请求数：
  ```promql
  rate(http_server_requests_seconds_count[5m])
  ```
  这会计算 5 分钟内每秒的请求数，适合监控 TPS 或 QPS。

- **sum() / avg() / max() / min()**：聚合函数，按标签分组计算。比如按接口汇总 TPS：
  ```promql
  sum(rate(http_server_requests_seconds_count[5m])) by (uri)
  ```

- **increase()**：计算一段时间内的增量，比如 5 分钟内的总请求数：
  ```promql
  increase(http_server_requests_seconds_count[5m])
  ```

- **irate()**：类似 `rate()`，但更适合瞬时变化，基于最后两个数据点：
  ```promql
  irate(http_server_requests_seconds_count[5m])
  ```

- **histogram_quantile()**：计算直方图的分位数，比如接口响应时间的 P95：
  ```promql
  histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))
  ```

- **up**：检查服务是否在线，1 表示正常，0 表示挂了：
  ```promql
  up == 0
  ```

### 2. 写 PromQL 的小技巧
- **标签过滤**：用 `{}` 过滤特定指标，比如只看 POST 请求：
  ```promql
  rate(http_server_requests_seconds_count{method="POST"}[5m])
  ```

- **正则匹配**：用 `=~` 匹配多个条件，比如监控所有增删改接口：
  ```promql
  rate(http_server_requests_seconds_count{method=~"POST|PUT|DELETE"}[5m])
  ```

- **时间范围**：`[5m]` 表示 5 分钟，调整范围能平衡灵敏度和稳定性。

我通常先在 Prometheus 的 Web UI 里试写 PromQL，确认结果正确后再加到规则文件里，省得反复改。

## 三、常见监控参数

在 Spring Boot 项目中，我结合 Actuator 和 Micrometer，重点监控以下指标，基本能覆盖大部分问题场景：

- **HTTP 请求**：
  - `http_server_requests_seconds_count`：请求总数，计算 TPS/QPS。
  - `http_server_requests_seconds_sum`：总耗时，算平均响应时间。
  - `http_server_requests_seconds_max`：最大响应时间，排查慢接口。
  - `http_server_requests_seconds_bucket`：响应时间分布，分析 P95/P99。

- **JVM 指标**：
  - `jvm_memory_used_bytes{area="heap"}`：堆内存使用量，防 OOM。
  - `jvm_gc_pause_seconds`：GC 暂停时间，影响性能。
  - `jvm_threads_deadlocked`：死锁线程数，0 正常，非 0 要命。

- **系统资源**：
  - `system_cpu_usage`：系统 CPU 使用率，超 80% 要警惕。
  - `process_cpu_usage`：进程 CPU 使用率。
  - `disk_free_bytes`：磁盘剩余空间，防止爆盘。

- **Tomcat**：
  - `tomcat_threads_busy`：忙碌线程数，线程池不够用会卡请求。
  - `tomcat_sessions_active_current`：活跃会话数，排查用户并发。

这些指标我都会在 Grafana 里建仪表盘，配上曲线图和表格，问题一目了然。

## 四、从零搭建 Prometheus 监控体系：配置项详解

要建一套完整的 Prometheus 监控体系，我一般从上往下配置以下部分，层层递进：

### 1. Prometheus 主配置文件（prometheus.yml）
这是监控体系的入口，定义了抓取目标和规则文件：

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules.yml"

scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['localhost:8080']
```

- **global**：全局配置，`scrape_interval` 控制抓取频率，`evaluation_interval` 控制规则评估频率。
- **rule_files**：加载规则文件。
- **scrape_configs**：定义抓取目标，比如 Spring Boot 应用的 Actuator 端点。

### 2. 规则文件（rules.yml）
定义告警和预计算逻辑，前面已经展示过示例。我会按服务或模块分组，比如 `api-metrics`、`jvm-metrics`，每组里写具体的告警规则。

### 3. Alertmanager 配置（alertmanager.yml）
Alertmanager 负责处理告警，发送到飞书或邮箱。我的配置如下：

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: 'feishu'
  repeat_interval: 1h

receivers:
  - name: 'feishu'
    webhook_configs:
      - url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxxxxx'
        send_resolved: true
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        from: 'prometheus@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'prometheus@example.com'
        auth_password: 'your_password'
```

- **global**：全局设置，`resolve_timeout` 定义告警恢复时间。
- **route**：路由规则，指定默认接收器（比如飞书）。
- **receivers**：定义告警接收方式，支持飞书 webhook、邮箱等。

### 4. Grafana 仪表盘
我用 Grafana 可视化指标，创建仪表盘展示 TPS、内存、CPU 等。数据源配置指向 Prometheus，PromQL 查询直接复用规则里的表达式。

### 5. Spring Boot 应用配置
在 Spring Boot 的 `application.yml` 里启用 Actuator 和 Prometheus：

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

这一套体系从数据采集（Spring Boot）、存储查询（Prometheus）、告警（Alertmanager）到可视化（Grafana），层次分明，覆盖了监控全流程。

## 五、集成飞书和邮箱告警的细节

### 1. 飞书告警
飞书告警靠 webhook 实现，配置简单：
- 在飞书群里添加机器人，获取 webhook URL（形如 `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`）。
- 在 `alertmanager.yml` 的 `receivers` 里配置 webhook：
  ```yaml
  - name: 'feishu'
    webhook_configs:
      - url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxxxxx'
        send_resolved: true
  ```
- 告警触发后，飞书群会收到消息，比如：
  ```
  [告警] 接口 TPS 过高
  实例: localhost:8080
  描述: TPS 超过 100，当前值为 120.5
  ```

我喜欢飞书告警是因为实时性强，团队能第一时间看到问题。

### 2. 邮箱告警
邮箱告警适合正式通知，比如发送给管理层。我用公司 SMTP 服务器配置：

```yaml
- name: 'email'
  email_configs:
    - to: 'team@example.com'
      from: 'prometheus@example.com'
      smarthost: 'smtp.example.com:587'
      auth_username: 'prometheus@example.com'
      auth_password: 'your_password'
      require_tls: true
```

- **smarthost**：SMTP 服务器地址和端口。
- **auth_username/auth_password**：邮件账户的凭证。
- **require_tls**：启用 TLS 加密，保障安全。

邮箱告警的格式可以通过模板自定义，比如加公司 logo 或详细描述。我一般会让飞书处理紧急告警，邮箱用来归档。

## 六、总结

通过 Prometheus 的规则文件和 PromQL，我能灵活监控 TPS、内存、CPU 等关键指标。规则文件的层级结构（groups → rules → alert/expr）基本上让我们能很好的监控数据的变化，PromQL 的函数（rate、sum、histogram_quantile）帮我分析数据，挖掘问题。搭建监控体系时，我从 `prometheus.yml` 到 `rules.yml` 再到 Alertmanager，层层配置，最后用 Grafana 做可视化，飞书和邮箱告警确保问题不漏网。

总而言之，言而总之。想充分理解配置的细节，一方面是看Prometheus.yml，另一方面是rules.yml，最后就是alertmanager.yml。这三个yml文件学明白了，基本问题不大。其次就是具体监控的expression，常用的基本是rate()，余下几个留个印象即可。