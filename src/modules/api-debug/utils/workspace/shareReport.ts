import type { ResponseData } from '../../types/workspace';
import type { SqlTraceResult } from '@/shared/kcbp/types';
import { parseKcbpAddress } from '../kcbp/kcbpAddress';
import { mergeCommonParams } from './commonParams';
import { buildParamsRawText, resolveRawMsgtype, type ParamsRawTextOptions } from './rawText';

/** 调用分享 HTML 报告：根据当前接口的 raw 入参 + 当前应答生成单文件
 *  离线 HTML（无外部依赖），应答表格支持点表头排序与分页（50/100/全部），
 *  由内嵌脚本以 textContent 渲染，单元格值不做 HTML 注入面。
 *  环境等元信息按需求不输出。 */

export interface ShareReportOptions extends ParamsRawTextOptions {
    /** 当前应答（响应区数据；null 时输出「暂无应答」占位） */
    response: ResponseData | null;
}

const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 列顺序：按行内键的首次出现顺序合并（与应用内表格一致） */
export function deriveResultSetColumns(rows: Record<string, unknown>[]): string[] {
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!seen.has(key)) {
                seen.add(key);
                columns.push(key);
            }
        }
    }
    return columns;
}

const BAD_FILENAME_CHARS = /[/\\:*?"<>|]/g;

/** 分享文件名：`case名-接口号.html`，清理非法文件名字符 */
export function buildShareReportFilename(tabName: string, msgtype: string): string {
    const clean = (value: string) => value.replace(BAD_FILENAME_CHARS, '-').trim();
    const left = clean(tabName);
    const right = clean(msgtype);
    if (!left && !right) return '分享报告.html';
    if (!right) return `${left}.html`;
    if (!left) return `${right}.html`;
    return `${left}-${right}.html`;
}

export interface ShareReportMeta {
    /** 标题：case 名称 +（接口号） */
    title: string;
    /** 接口号：地址 msgtype 优先，回退 funcid 参数 */
    msgtype: string;
}

/** 解析报告标题与接口号（含公共参数合并，与实际发送一致） */
export function resolveShareReportMeta(options: ParamsRawTextOptions): ShareReportMeta {
    const merged = mergeCommonParams(options.commonParams, options.params);
    const msgtype = resolveRawMsgtype(parseKcbpAddress(options.address).msgtype, merged);
    const title = msgtype ? `${options.tabName}（${msgtype}）` : options.tabName;
    return { title, msgtype };
}

const SCRIPT_TAG_CLOSE = '</script>';

/** 序列化结果集数据为内嵌 JSON：< 等字符转义防止 </script> 提前闭合；
 *  渲染侧用 textContent 输出，不存在注入面。 */
function serializeResultSetJson(columns: string[], rows: Record<string, unknown>[]): string {
    return JSON.stringify({ columns, rows })
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

const REPORT_STYLE = `
:root { color-scheme: light; --line: #d9d9d9; --head-bg: #f5f5f5; --accent: #1677ff; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; font: 14px/1.6 "Segoe UI", "Microsoft YaHei", sans-serif; color: #333; background: #fff; }
h1 { font-size: 20px; margin: 0 0 20px; }
h2 { font-size: 15px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--line); }
h3 { font-size: 14px; margin: 16px 0 6px; }
.raw-params { margin: 0; padding: 12px; background: #fafafa; border: 1px solid var(--line); border-radius: 6px; white-space: pre-wrap; word-break: break-all; font: 12px/1.6 Consolas, monospace; }
.resp-summary { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; }
.badge { display: inline-block; padding: 1px 10px; border-radius: 10px; font-size: 12px; }
.badge--ok { background: #e6f7ef; color: #0f8a4d; }
.badge--error { background: #fdecec; color: #cf1322; }
.rs { margin-bottom: 24px; }
.rs-info { color: #888; font-size: 12px; margin-bottom: 4px; }
.table-wrap { border: 1px solid var(--line); border-radius: 6px; overflow: auto; max-height: 70vh; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
thead th { position: sticky; top: 0; background: var(--head-bg); text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; cursor: pointer; user-select: none; font-size: 14px; font-weight: 600; }
thead th:hover { background: #eef3fb; }
tbody td { padding: 5px 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
tbody tr:nth-child(even) { background: #fafbfc; }
.idx { color: #aaa; }
.rs-empty { padding: 24px; text-align: center; color: #999; }
.pager { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; flex-wrap: wrap; }
.pager button { padding: 2px 10px; border: 1px solid var(--line); background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; }
.pager button:disabled { color: #bbb; cursor: default; }
.pager button.page-size { background: var(--accent); border-color: var(--accent); color: #fff; }
.pager button.page-size.off { background: #fff; border-color: var(--line); color: #555; }
.empty { color: #999; }
.sql-trace { margin-top: 24px; }
.sql-trace-event { margin-bottom: 12px; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.sql-trace-header { padding: 8px 12px; background: var(--head-bg); cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 13px; }
.sql-trace-header:hover { background: #eef3fb; }
.sql-trace-time { color: #666; }
.sql-trace-type { font-weight: 600; }
.sql-trace-duration { color: var(--accent); }
.sql-trace-object { color: #888; }
.sql-trace-sql { padding: 12px; background: #fafafa; font: 12px/1.5 Consolas, monospace; white-space: pre-wrap; word-break: break-all; margin: 0; border-top: 1px solid var(--line); }
.sql-keyword { color: var(--accent); font-weight: 600; }
.sql-comment { color: #999; font-style: italic; }
.sql-string { color: #0f8a4d; }
.sql-number { color: #d4a017; }
`;

const REPORT_SCRIPT = `
(function () {
  'use strict';
  function text(value) { return value == null ? '' : String(value); }
  document.querySelectorAll('.rs').forEach(function (rs) {
    var dataEl = rs.querySelector('.rs-data');
    var data = { columns: [], rows: [] };
    try { data = dataEl ? JSON.parse(dataEl.textContent || '{}') : data; } catch (e) { /* 保持空数据 */ }
    var columns = data.columns || [];
    var rows = data.rows || [];
    var state = { sortKey: null, dir: 1, page: 1, pageSize: 50 };
    var wrap = rs.querySelector('.rs-table');
    var pager = rs.querySelector('.rs-pager');
    var info = rs.querySelector('.rs-info');

    function sorted() {
      if (!state.sortKey) return rows;
      return rows.slice().sort(function (a, b) {
        var av = text(a[state.sortKey]);
        var bv = text(b[state.sortKey]);
        var an = Number(av), bn = Number(bv);
        if (av !== '' && bv !== '' && !isNaN(an) && !isNaN(bn)) return (an - bn) * state.dir;
        return av.localeCompare(bv, 'zh-Hans-CN') * state.dir;
      });
    }
    function totalPages(sortedRows) {
      return state.pageSize === 0 ? 1 : Math.max(1, Math.ceil(sortedRows.length / state.pageSize));
    }
    function render() {
      var sortedRows = sorted();
      var pages = totalPages(sortedRows);
      if (state.page > pages) state.page = pages;
      var start = state.pageSize === 0 ? 0 : (state.page - 1) * state.pageSize;
      var view = state.pageSize === 0 ? sortedRows : sortedRows.slice(start, start + state.pageSize);

      if (!columns.length && !rows.length) {
        wrap.innerHTML = '';
        var empty = document.createElement('div');
        empty.className = 'rs-empty';
        empty.textContent = '无数据';
        wrap.appendChild(empty);
        if (info) info.textContent = '';
        pager.innerHTML = '';
        return;
      }

      var table = document.createElement('table');
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      var idxTh = document.createElement('th');
      idxTh.textContent = '#';
      idxTh.style.cursor = 'default';
      headRow.appendChild(idxTh);
      columns.forEach(function (col) {
        var th = document.createElement('th');
        th.textContent = col;
        if (state.sortKey === col) {
          th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
          th.textContent = (state.dir === 1 ? '↑ ' : '↓ ') + col;
        }
        th.addEventListener('click', function () {
          if (state.sortKey === col) { state.dir = -state.dir; }
          else { state.sortKey = col; state.dir = 1; }
          render();
        });
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      var tbody = document.createElement('tbody');
      view.forEach(function (row, i) {
        var tr = document.createElement('tr');
        var idx = document.createElement('td');
        idx.className = 'idx';
        idx.textContent = String(start + i + 1);
        tr.appendChild(idx);
        columns.forEach(function (col) {
          var td = document.createElement('td');
          td.textContent = text(row[col]);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      wrap.innerHTML = '';
      wrap.appendChild(table);

      if (info) {
        var label = '共 ' + rows.length + ' 行';
        if (state.sortKey) label += ' · 已按 ' + state.sortKey + ' ' + (state.dir === 1 ? '升序' : '降序');
        info.textContent = label;
      }
      renderPager(pages);
    }
    function renderPager(pages) {
      pager.innerHTML = '';
      if (!rows.length) return;
      var prev = document.createElement('button');
      prev.textContent = '上一页';
      prev.disabled = state.page <= 1;
      prev.addEventListener('click', function () { state.page -= 1; render(); });
      var next = document.createElement('button');
      next.textContent = '下一页';
      next.disabled = state.page >= pages;
      next.addEventListener('click', function () { state.page += 1; render(); });
      var label = document.createElement('span');
      label.textContent = '第 ' + state.page + ' / ' + pages + ' 页';
      pager.appendChild(prev);
      pager.appendChild(next);
      pager.appendChild(label);
      [50, 100, 0].forEach(function (size) {
        var btn = document.createElement('button');
        btn.className = 'page-size' + (state.pageSize === size ? '' : ' off');
        btn.setAttribute('data-page-size', size === 0 ? 'all' : String(size));
        btn.textContent = size === 0 ? '全部' : size + ' 条/页';
        btn.addEventListener('click', function () {
          state.pageSize = size;
          state.page = 1;
          render();
        });
        pager.appendChild(btn);
      });
    }
    render();
  });
})();
`;

function formatSqlForReport(sql: string): string {
    return escapeHtml(sql)
        .replace(
            /\b(select|from|where|group|order|having|union|except|intersect|values|set|return|join|inner|left|right|full|cross|as|and|or|on|in|is|null|not|like|top|distinct|insert|update|delete|merge|into|begin|end|declare|exec|execute)\b/gi,
            '<span class="sql-keyword">$1</span>',
        )
        .replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>')
        .replace(/('(?:''|[^'])*')/g, '<span class="sql-string">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');
}

function renderTraceSection(trace: SqlTraceResult | undefined): string {
    if (!trace || !trace.events.length) return '';
    const events = trace.events
        .map((event) => {
            const time = new Date(event.timestampUtc).toLocaleTimeString();
            const sqlHtml = event.sqlText ? formatSqlForReport(event.sqlText) : '—';
            return [
                `<details class="sql-trace-event" open>`,
                `<summary class="sql-trace-header">`,
                `<span class="sql-trace-time">${escapeHtml(time)}</span>`,
                `<span class="sql-trace-type">${escapeHtml(event.eventType)}</span>`,
                `<span class="sql-trace-duration">${event.durationMs.toFixed(2)} ms</span>`,
                event.objectName
                    ? `<span class="sql-trace-object">${escapeHtml(event.objectName)}</span>`
                    : '',
                `</summary>`,
                `<pre class="sql-trace-sql">${sqlHtml}</pre>`,
                `</details>`,
            ].join('');
        })
        .join('\n');
    return [
        `<div class="sql-trace">`,
        `<p style="color: #888; font-size: 12px; margin-bottom: 8px;">${trace.events.length} events</p>`,
        events,
        `</div>`,
    ].join('');
}

function renderResultSets(response: ResponseData): string {
    if (!response.resultSets.length) {
        return '<p class="empty">无结果集</p>';
    }
    return response.resultSets
        .map((resultSet, index) => {
            const name = resultSet.name || `结果集 ${index + 1}`;
            const columns = deriveResultSetColumns(resultSet.rows);
            return [
                `<div class="rs">`,
                `<h3>${escapeHtml(name)}</h3>`,
                `<div class="rs-info"></div>`,
                `<div class="table-wrap rs-table"></div>`,
                `<div class="rs-pager pager"></div>`,
                `<script type="application/json" class="rs-data">`,
                serializeResultSetJson(columns, resultSet.rows),
                `${SCRIPT_TAG_CLOSE}</div>`,
            ].join('');
        })
        .join('\n');
}

/** 组装调用分享 HTML 报告：标题（case 名 + 接口号）、raw 入参、应答结果集 */
export function buildShareReportHtml(options: ShareReportOptions): string {
    const { title } = resolveShareReportMeta(options);
    const rawText = buildParamsRawText(options);
    const response = options.response;

    const traceSection = response ? renderTraceSection(response.trace) : '';
    const summary = response
        ? [
              '<p class="resp-summary">',
              `<span class="badge ${String(response.code) === '0' ? 'badge--ok' : 'badge--error'}">code=${escapeHtml(String(response.code))}</span>`,
              `<span>${escapeHtml(response.message)}</span>`,
              '</p>',
              renderResultSets(response),
          ].join('')
        : '<p class="empty">暂无应答</p>';

    return [
        '<!DOCTYPE html>',
        '<html lang="zh-CN">',
        '<head>',
        '<meta charset="UTF-8">',
        `<title>${escapeHtml(title)} · 调用分享</title>`,
        `<style>${REPORT_STYLE}</style>`,
        '</head>',
        '<body>',
        `<h1>${escapeHtml(title)}</h1>`,
        '<section><h2>入参</h2>',
        `<pre class="raw-params">${escapeHtml(rawText)}</pre>`,
        '</section>',
        '<section><h2>应答</h2>',
        summary,
        '</section>',
        traceSection ? `<section><h2>SQL Trace</h2>${traceSection}</section>` : '',
        `<script>${REPORT_SCRIPT}${SCRIPT_TAG_CLOSE}`,
        '</body>',
        '</html>',
    ].join('\n');
}
