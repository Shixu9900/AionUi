/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

const FORBIDDEN =
  /改(底层|架构|结构|字段|解析|识页|种类)|新增种类|增加种类|换(成|用).{0,8}(模型|ocr|识别)|不要用\s*mineru|停用\s*mineru|change the schema|new categor/i;

/** Returns a refusal when the instruction would change the knowledge base itself. */
export const fenceReply = (text: string): string | null => {
  if (!FORBIDDEN.test(text)) return null;
  return '这条指令会改知识库的底层结构或识页方式。这里只能把文件归进已经定好的种类：件号、适航指令、服务通告引用、手册节点、租赁条款。请告诉我这份文件属于哪一类，以及哪一项字段需要补上。';
};
