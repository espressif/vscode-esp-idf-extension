NVS 分区编辑器
==============

:link_to_translation:`en:[English]`

通过 ``ESP-IDF：打开 NVS 分区编辑器`` 指令，可以根据 CSV 文件中的键值对创建 NVS 分区二进制文件。

生成的二进制文件与 `ESP-IDF 非易失性存储库 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-reference/storage/nvs_flash.html>`_ 中定义的 NVS 架构兼容。

CSV 文件格式应如下所示：

.. code-block::

    key,type,encoding,value     <-- 列标题（必须在第一行）
    namespace_name,namespace,,  <-- 第一项必须是 "namespace" 类型
    key1,data,u8,1
    key2,file,string,/path/to/file

1.  前往菜单栏 ``查看`` > ``命令面板``。
2.  输入 ``ESP-IDF：打开 NVS 分区编辑器``，选择该命令以创建新文件，或右键单击已有的分区表 CSV 文件。
3.  如果选择创建新文件，请输入文件名。新文件将存储在当前编辑器目录下。

    .. note::

        请确保现有 CSV 文件的前两行内容与示例中的 CSV 格式一致。

4.  对 CSV 文件进行必要更改。

    .. note::

        请确保分区大小足以容纳插入的数据。

    .. image:: ../../../media/tutorials/nvs/nvs_partition_editor.png

5.  保存 CSV 数据。首次保存将创建新的 CSV 文件。
6. （可选）启用二进制文件加密。启用加密后，可以禁用生成密钥选项从而选择自己的密钥。此时，需要为密钥设置绝对路径。
7.  生成分区二进制文件。

此功能基于 ESP-IDF `NVS 分区生成工具 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-reference/storage/nvs_partition_gen.html>`_。

为确保此功能正常运行，请确保按照 :ref:`安装 ESP-IDF 和相关工具 <installation>` 中的说明来配置扩展。
