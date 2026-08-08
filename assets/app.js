(function () {
  const DATA = window.ART_NEWS_DATA || {};
  const SECTION_META = DATA.meta || {};
  const TEXT = DATA.text || {};
  const PAGE_SIZE = DATA.pageSize || {};
  const sections = DATA.sections || {};

  const state = {};

  function init() {
    renderHeader();
    renderSectionNav();
    renderPanels();
    renderFailures();
    bindTabs();
    bindPanelFilters();
  }

  function renderHeader() {
    setText('[data-page-title]', TEXT.pageTitle || '哇咔咔每日推送');
    setText('[data-page-subtitle]', TEXT.subtitle || '');
    setText('[data-generated-date]', formatDisplayDate(DATA.generatedAt));

    const stats = document.querySelector('[data-stats]');
    if (!stats) return;
    stats.innerHTML = Object.keys(SECTION_META)
      .map(section => renderStat(section, (sections[section] || []).length))
      .join('');
  }

  function renderSectionNav() {
    const nav = document.getElementById('section-nav');
    if (!nav) return;
    nav.innerHTML = Object.keys(SECTION_META).map((section, index) => {
      const meta = SECTION_META[section];
      return `<button class="tab-btn ${index === 0 ? 'active' : ''}" data-section="${escapeHtml(section)}" type="button"><span class="num">${escapeHtml(meta.index)}</span>${escapeHtml(meta.title)}</button>`;
    }).join('');
  }

  function renderPanels() {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = [
      renderDesignPanel(sections.design || []),
      renderBizPanel(sections.biz || []),
      renderPluginPanel(sections.plugin || []),
      renderCrowdPanel(sections.crowd || [])
    ].join('');
  }

  function renderFailures() {
    const target = document.getElementById('failures');
    if (!target) return;
    const failures = (DATA.report && DATA.report.failures) || [];
    if (!failures.length) {
      target.innerHTML = '';
      return;
    }
    target.innerHTML = `<section class="failures">
      <h2>${escapeHtml(TEXT.failures || '本次读取失败')}</h2>
      <ul>${failures.map(failure => `<li>${escapeHtml(failure.name)}: ${escapeHtml(failure.error)}</li>`).join('')}</ul>
    </section>`;
  }

  function renderStat(section, count) {
    const meta = SECTION_META[section];
    return `<span class="stat">${escapeHtml(meta.title)} <b>${formatNumber(count)}</b> ${escapeHtml(meta.countUnit)}</span>`;
  }

  function renderDesignPanel(articles) {
    return `<section class="panel active" id="panel-design" data-section="design" data-paginated="true" data-page-size="${PAGE_SIZE.design || 12}">
      ${renderToolbar('design', articles, { date: true, source: true, search: true })}
      ${renderGroupedArticles('design', articles)}
      ${renderPager()}
    </section>`;
  }

  function renderBizPanel(articles) {
    return `<section class="panel" id="panel-biz" data-section="biz" data-paginated="true" data-page-size="${PAGE_SIZE.biz || 16}">
      ${renderToolbar('biz', articles, { date: true, source: true, search: true })}
      ${renderGroupedArticles('biz', articles)}
      ${renderPager()}
    </section>`;
  }

  function renderPluginPanel(articles) {
    const rankedArticles = [...articles].sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));
    const tags = getTags(rankedArticles);
    return `<section class="panel" id="panel-plugin" data-section="plugin">
      <div class="board-toolbar">
        <div class="select-wrap source">
          <select class="tag-filter" data-filter="tag" aria-label="${escapeHtml(TEXT.tag || '标签')}">
            <option value="">${escapeHtml(TEXT.tagAll || '今日全部标签')}</option>
            ${tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('')}
          </select>
        </div>
        <span class="note">${escapeHtml(formatDisplayDate(DATA.generatedAt).replace(/ \/ /g, '.'))} - ${escapeHtml(TEXT.pluginNote || '')}</span>
      </div>
      <div class="board-list">
        ${rankedArticles.length ? rankedArticles.map(renderPluginItem).join('') : `<p class="empty-state">${escapeHtml(SECTION_META.plugin.empty)}</p>`}
      </div>
    </section>`;
  }

  function renderCrowdPanel(articles) {
    const rankedArticles = [...articles].sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));
    const categories = [...new Set(rankedArticles.map(article => article.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return `<section class="panel" id="panel-crowd" data-section="crowd">
      <div class="crowd-overview">
        <div class="select-wrap source">
          <select class="tag-filter" data-filter="tag" aria-label="${escapeHtml(TEXT.tag || '标签')}">
            <option value="">全部分类</option>
            ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}
          </select>
        </div>
        <span class="note">${escapeHtml(TEXT.crowdNote || '')} - ${escapeHtml(formatDisplayDate(DATA.generatedAt).replace(/ \/ /g, '.'))} - 共 ${rankedArticles.length} 个项目</span>
      </div>
      <div class="crowd-list">
        ${rankedArticles.length ? rankedArticles.map(renderCrowdItem).join('') : `<p class="empty-state">${escapeHtml(SECTION_META.crowd.empty)}</p>`}
      </div>
    </section>`;
  }

  function renderToolbar(section, articles, options) {
    const sources = getSources(articles);
    const dates = getDates(articles);
    const sourceSelectId = section === 'biz' ? ' id="bizSourceSelect"' : '';
    return `<div class="toolbar" data-toolbar="${escapeHtml(section)}">
      ${options.source ? `<div class="select-wrap source">
        <select${sourceSelectId} class="source-filter" data-filter="source" aria-label="${escapeHtml(TEXT.source || '来源')}">
          <option value="">${escapeHtml(TEXT.sourceAll || '全部来源')}</option>
          ${sources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join('')}
        </select>
      </div>` : ''}
      ${section === 'biz' ? `<div id="hnSubfilter" class="select-wrap source hn-subfilter">
        <select class="hn-filter" data-filter="hn" aria-label="HackNews">
          <option value="">HackNews all</option>
          <option value="new">new</option>
          <option value="ask">ask</option>
        </select>
      </div>` : ''}
      ${options.date ? `<div class="select-wrap date">
        <select class="date-filter" data-filter="date" aria-label="${escapeHtml(TEXT.date || '日期')}">
          <option value="">${escapeHtml(TEXT.dateAll || '全部日期')}</option>
          ${dates.map(date => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`).join('')}
        </select>
      </div>` : ''}
      ${options.search ? `<div class="toolbar-search">
        <input class="keyword-filter" data-filter="keyword" type="search" autocomplete="off" placeholder="${escapeHtml(TEXT.searchPlaceholder || '')}">
        <button class="search-button" type="button">${escapeHtml(TEXT.search || '搜索')}</button>
      </div>` : ''}
    </div>`;
  }

  function renderGroupedArticles(section, articles) {
    const grouped = groupByDate(articles);
    const dates = Object.keys(grouped);
    if (!dates.length) return `<p class="empty-state">${escapeHtml(SECTION_META[section].empty)}</p>`;

    return dates.map(date => {
      const items = grouped[date];
      return `<div class="date-group" data-date-group="${escapeHtml(date)}">
        <div class="date-heading">
          <h2>${escapeHtml(date)}</h2>
          ${renderRelativeDateLabel(date)}
          <span class="count">${items.length} ${escapeHtml(SECTION_META[section].countUnit)}</span>
        </div>
        <div class="${section === 'biz' ? 'wire-list' : 'index-list'}">
          ${items.map(article => section === 'biz' ? renderBizItem(article) : renderDesignItem(article)).join('')}
        </div>
      </div>`;
    }).join('');
  }

  function renderDesignItem(article) {
    const displayDate = normalizeDate(article.publishedAt || article.crawledAt);
    return `<div class="index-item filter-item" data-source="${escapeHtml(article.sourceName)}" data-date="${escapeHtml(displayDate)}" data-keyword="${escapeHtml(getKeywordText(article))}">
      <span class="marker">&diams;</span>
      <div class="body">
        <div class="source">${escapeHtml(article.sourceName)}</div>
        <div class="title"><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></div>
        <div class="meta">${escapeHtml(TEXT.author || '作者：')}${escapeHtml(article.author || article.sourceName)} &middot; ${escapeHtml(displayDate)}</div>
      </div>
    </div>`;
  }

  function renderBizItem(article) {
    const displayDate = normalizeDate(article.publishedAt || article.crawledAt);
    const hnCategory = article.sourceName === 'HackNews' ? String(article.hnCategory || article.category || '').toLowerCase() : '';
    const extra = article.sourceName === 'HackNews' ? renderHackNewsExtra(article) : '';
    return `<div class="wire-item filter-item" data-source="${escapeHtml(article.sourceName)}" data-date="${escapeHtml(displayDate)}" data-hn-category="${escapeHtml(hnCategory)}" data-keyword="${escapeHtml(getKeywordText(article))}">
      <span class="marker"></span>
      <span class="body">
        <span class="source">${escapeHtml(article.sourceName)}</span>
        ${hnCategory ? `<span class="hn-tag">${escapeHtml(hnCategory)}</span>` : ''}
        <span class="title"><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></span>
        ${extra}
      </span>
    </div>`;
  }

  function renderHackNewsExtra(article) {
    const score = Number(article.score || 0);
    const comments = Number(article.comments || 0);
    const parts = [];
    if (score) parts.push(`${formatNumber(score)} points`);
    parts.push(`${formatNumber(comments)} comments`);
    return `<span class="wire-extra">${escapeHtml(parts.join(' · '))}</span>`;
  }

  function renderPluginItem(article, index) {
    const rank = Number(article.rank || index + 1);
    const tags = Array.isArray(article.tags) ? article.tags : [];
    const tagsZh = Array.isArray(article.tagsZh) ? article.tagsZh : [];
    const titleZh = article.titleZh || '';
    return `<a class="board-item filter-item" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" data-tag="${escapeHtml(tags.join('|'))}" data-keyword="${escapeHtml(getKeywordText(article))}">
      <div class="board-rank">${String(rank).padStart(2, '0')}</div>
      <div class="board-body">
        <h3><span class="hint" ${titleZh ? `data-zh="${escapeHtml(titleZh)}"` : ''}>${escapeHtml(article.title)}</span></h3>
        ${article.summary ? `<p>${escapeHtml(article.summary)}</p>` : ''}
        <div class="board-tags">${tags.map((tag, tagIndex) => {
          const tagZh = tagsZh[tagIndex] || '';
          return `<span class="hint" ${tagZh ? `data-zh="${escapeHtml(tagZh)}"` : ''}>${escapeHtml(tag)}</span>`;
        }).join('')}</div>
      </div>
    </a>`;
  }

  function renderCrowdItem(article, index) {
    const rank = Number(article.rank || index + 1);
    const fundedPercent = Number(article.fundedPercent || 0);
    const fundWidth = Math.max(0, Math.min(100, fundedPercent));
    const daysText = article.daysLeft === '' || article.daysLeft === undefined
      ? '剩余时间未知'
      : `剩余 ${escapeHtml(article.daysLeft)} 天`;
    const backersText = article.backersCount
      ? `${formatNumber(article.backersCount)} 人支持`
      : '支持人数未知';
    const category = article.category || (Array.isArray(article.tags) ? article.tags[0] : '');
    const location = article.location || (Array.isArray(article.tags) ? article.tags[1] : '');
    const tagsZh = Array.isArray(article.tagsZh) ? article.tagsZh : [];
    const titleZh = article.titleZh || '';
    const categoryZh = tagsZh[0] || '';
    const locationZh = tagsZh[1] || '';
    const keyword = [
      getKeywordText(article),
      article.blurb,
      article.category,
      article.location
    ].filter(Boolean).join(' ').toLowerCase();

    return `<a class="crowd-item filter-item" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" data-tag="${escapeHtml(category)}" data-keyword="${escapeHtml(keyword)}">
      <div class="crowd-rank">${String(rank).padStart(2, '0')}</div>
      ${renderCrowdThumb(article)}
      <div class="crowd-body">
        <div class="crowd-title"><span class="hint" ${titleZh ? `data-zh="${escapeHtml(titleZh)}"` : ''}>${escapeHtml(article.title)}</span></div>
        <div class="crowd-meta-line">
          <span class="crowd-creator">${escapeHtml(article.author || article.sourceName)}</span>
          ${category ? `<span class="crowd-tag hint" ${categoryZh ? `data-zh="${escapeHtml(categoryZh)}"` : ''}>${escapeHtml(category)}</span>` : ''}
          ${location ? `<span class="crowd-tag hint" ${locationZh ? `data-zh="${escapeHtml(locationZh)}"` : ''}>${escapeHtml(location)}</span>` : ''}
        </div>
        ${(article.blurb || article.summary) ? `<p class="crowd-blurb">${escapeHtml(article.blurb || article.summary)}</p>` : ''}
        <div class="crowd-stats">
          <span class="crowd-fund"><span class="fund-bar"><span class="fund-bar-fill" style="width:${fundWidth}%;"></span></span><span class="pct">${formatNumber(fundedPercent)}%</span></span>
          <span class="sep">&middot;</span>
          <span>${daysText}</span>
          <span class="sep">&middot;</span>
          <span>${backersText}</span>
        </div>
      </div>
    </a>`;
  }

  function renderCrowdThumb(article) {
    if (!article.image) return '<div class="crowd-thumb is-empty">NO IMG</div>';
    return `<div class="crowd-thumb"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" loading="lazy"></div>`;
  }

  function renderRelativeDateLabel(date) {
    const today = normalizeDate(new Date().toISOString());
    const yesterday = normalizeDate(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (date === today) return '<span class="rel">今天</span>';
    if (date === yesterday) return '<span class="rel">昨天</span>';
    return '';
  }

  function renderPager() {
    return `<div class="pager" aria-label="pagination">
      <span class="pager-status">1 / 1</span>
      <div class="pager-actions">
        <button class="pager-prev" type="button">Prev</button>
        <button class="pager-next" type="button">Next</button>
      </div>
    </div>`;
  }

  function bindTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = {
      design: document.getElementById('panel-design'),
      biz: document.getElementById('panel-biz'),
      plugin: document.getElementById('panel-plugin'),
      crowd: document.getElementById('panel-crowd')
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.section;
        tabs.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        Object.keys(panels).forEach(section => {
          if (panels[section]) panels[section].classList.toggle('active', section === key);
        });
      });
    });
  }

  function bindPanelFilters() {
    document.querySelectorAll('.panel').forEach(panel => {
      const sourceFilter = panel.querySelector('.source-filter');
      const dateFilter = panel.querySelector('.date-filter');
      const tagFilter = panel.querySelector('.tag-filter');
      const hnFilter = panel.querySelector('.hn-filter');
      const hnSubfilter = panel.querySelector('#hnSubfilter');
      const keywordFilter = panel.querySelector('.keyword-filter');
      const searchButton = panel.querySelector('.search-button');
      const isPaginated = panel.dataset.paginated === 'true';
      const pageSize = Number(panel.dataset.pageSize || 12);
      const pager = panel.querySelector('.pager');
      const pagerStatus = panel.querySelector('.pager-status');
      const prevButton = panel.querySelector('.pager-prev');
      const nextButton = panel.querySelector('.pager-next');
      state[panel.id] = { page: 1 };

      function applyFilters() {
        state[panel.id].page = 1;
        renderFilteredItems();
      }

      function matchesFilters(item) {
        const source = sourceFilter ? sourceFilter.value : '';
        const date = dateFilter ? dateFilter.value : '';
        const tag = tagFilter ? tagFilter.value : '';
        const hn = hnFilter && hnSubfilter && hnSubfilter.classList.contains('is-visible') ? hnFilter.value : '';
        const keyword = keywordFilter ? keywordFilter.value.trim().toLowerCase() : '';

        const matchesSource = !source || item.dataset.source === source;
        const matchesDate = !date || item.dataset.date === date;
        const matchesTag = !tag || (item.dataset.tag || '').split('|').includes(tag);
        const matchesHn = !hn || item.dataset.hnCategory === hn;
        const matchesKeyword = !keyword || (item.dataset.keyword || '').includes(keyword);
        return matchesSource && matchesDate && matchesTag && matchesHn && matchesKeyword;
      }

      function renderFilteredItems() {
        const items = Array.from(panel.querySelectorAll('.filter-item'));
        const matchedItems = items.filter(matchesFilters);
        const totalPages = isPaginated ? Math.max(1, Math.ceil(matchedItems.length / pageSize)) : 1;
        state[panel.id].page = Math.min(state[panel.id].page, totalPages);
        const start = (state[panel.id].page - 1) * pageSize;
        const pageItems = new Set(isPaginated ? matchedItems.slice(start, start + pageSize) : matchedItems);

        items.forEach(item => item.classList.toggle('is-hidden', !pageItems.has(item)));
        panel.querySelectorAll('.date-group').forEach(group => {
          const visible = Array.from(group.querySelectorAll('.filter-item')).some(item => !item.classList.contains('is-hidden'));
          group.classList.toggle('is-hidden', !visible);
        });

        if (pager) {
          pager.classList.toggle('is-hidden', !isPaginated || matchedItems.length <= pageSize);
          if (pagerStatus) {
            pagerStatus.textContent = matchedItems.length
              ? `${state[panel.id].page} / ${totalPages} - ${matchedItems.length} items`
              : '0 / 0 - 0 items';
          }
          if (prevButton) prevButton.disabled = state[panel.id].page <= 1;
          if (nextButton) nextButton.disabled = state[panel.id].page >= totalPages;
        }
      }

      [sourceFilter, dateFilter, tagFilter].forEach(control => {
        if (control) control.addEventListener('change', applyFilters);
      });
      if (sourceFilter && hnSubfilter && hnFilter) {
        sourceFilter.addEventListener('change', () => {
          const isHackNews = sourceFilter.value === 'HackNews';
          hnSubfilter.classList.toggle('is-visible', isHackNews);
          if (!isHackNews) hnFilter.value = '';
          applyFilters();
        });
      }
      if (hnFilter) hnFilter.addEventListener('change', applyFilters);
      if (keywordFilter) {
        keywordFilter.addEventListener('keydown', event => {
          if (event.key === 'Enter') applyFilters();
        });
      }
      if (searchButton) searchButton.addEventListener('click', applyFilters);
      if (prevButton) {
        prevButton.addEventListener('click', () => {
          state[panel.id].page = Math.max(1, state[panel.id].page - 1);
          renderFilteredItems();
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      if (nextButton) {
        nextButton.addEventListener('click', () => {
          state[panel.id].page += 1;
          renderFilteredItems();
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      renderFilteredItems();
    });
  }

  function groupByDate(articles) {
    return articles.reduce((groups, article) => {
      const date = normalizeDate(article.publishedAt || article.crawledAt);
      groups[date] = groups[date] || [];
      groups[date].push(article);
      return groups;
    }, {});
  }

  function getSources(articles) {
    return [...new Set(articles.map(article => article.sourceName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  function getDates(articles) {
    return Object.keys(groupByDate(articles));
  }

  function getTags(articles) {
    return [...new Set(articles.flatMap(article => Array.isArray(article.tags) ? article.tags : []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  function normalizeDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatDateInTaipei(new Date());
    return formatDateInTaipei(date);
  }

  function formatDateInTaipei(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function formatDisplayDate(value) {
    return normalizeDate(value || new Date().toISOString()).replace(/-/g, ' / ');
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    if (Number.isNaN(number)) return '0';
    return new Intl.NumberFormat('en-US').format(number);
  }

  function getKeywordText(article) {
    return [
      article.title,
      article.originalTitle,
      article.sourceName,
      article.author,
      article.summary,
      ...(Array.isArray(article.tags) ? article.tags : [])
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function setText(selector, text) {
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
