package cn.edu.cqut.advisorplatform.service.impl.monitor;

record MonitorInstantMetrics(
    double availability,
    double qps,
    double p95,
    double p99,
    double errorRate,
    double heapUsed,
    double heapMax,
    double gcRate,
    double cpu,
    double memory,
    double disk) {}
