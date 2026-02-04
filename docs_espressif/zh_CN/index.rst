适用于 VS Code 的 ESP-IDF 扩展
==============================

:link_to_translation:`en:[English]`

借助乐鑫 IoT 开发框架 (ESP-IDF)，专为 VS Code 设计的 ESP-IDF 扩展能够助力开发者高效地进行基于乐鑫芯片的项目开发、构建、烧录、监控、调试和管理。此扩展与 VS Code 无缝集成，在开发者熟悉的环境中提供了便捷的工作流程。本文档旨在帮助初学者和经验丰富的开发者完成设置和配置，并且更有效地利用 ESP-IDF 扩展，从而充分挖掘乐鑫芯片在物联网应用中的无限潜能。

.. toctree::
    :maxdepth: 1

    准备工作 <prerequisites>
    安装 ESP-IDF 和工具 <installation>
    启动项目 <startproject>
    连接设备 <connectdevice>
    配置项目 <configureproject>
    构建项目 <buildproject>
    烧录项目 <flashdevice>
    监视输出 <monitoroutput>
    调试项目 <debugproject>
    其他 IDE 功能 <additionalfeatures>
    故障排除 <troubleshooting>
    设置 <settings>
    可用命令列表 <commands>
    常见问题 <faqs>
    发布说明 <release_notes>

功能
----

1. 应用级跟踪
2. 构建项目
3. CMakeLists 编辑器
4. 代码覆盖率
5. 调试设备
6. 诊断命令
7. eFuse 查看工具
8. 烧录特定分区或获取当前设备分区树中的二进制文件
9. 使用 UART、DFU（适用于 ESP32-S2 和 ESP32-S3）或 JTAG（通过 OpenOCD）接口进行烧录
10. 堆跟踪
11. 从乐鑫组件注册表中选取组件进行安装，并将 Arduino 用作 ESP-IDF 组件
12. 管理同一项目的多个配置
13. 在同一窗口中管理多个项目
14. 监视设备的输出
15. NVS 分区编辑器
16. 新项目向导
17. 分区编辑器
18. 使用核心转储或 GDB stub 进行事后调试
19. 选择串口
20. 设置向导
21. 二进制文件大小分析
22. 系统视图跟踪
23. 单元测试
24. 使用 QEMU 模拟调试和监视输出
25. 在 Docker 容器中使用扩展
26. 在 WSL 中使用扩展


详情请参阅 https://github.com/espressif/vscode-esp-idf-extension。
