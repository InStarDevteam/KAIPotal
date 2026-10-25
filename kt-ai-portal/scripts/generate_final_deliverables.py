#!/usr/bin/env python3
"""Generate final proposal deliverables for 23단계."""
import os
import re
import csv
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

ROOT = Path('/Users/choikyubeom/Documents/kimi-projects/KAIPotal/kt-ai-portal')
DOCS = ROOT / 'docs'
PKG = ROOT / 'proposal-package'
ASSETS = DOCS / 'assets' / 'final'


def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def parse_markdown_table(text: str):
    """Parse a markdown table into list of dicts."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    rows = []
    header = None
    for line in lines:
        if line.startswith('|') and line.endswith('|'):
            cells = [c.strip() for c in line[1:-1].split('|')]
            if cells and all('-' in c for c in cells):
                continue
            if header is None:
                header = cells
            else:
                rows.append(dict(zip(header, cells)))
    return header, rows


def build_final_proposal():
    proposal_draft = read_text(DOCS / 'PROPOSAL_DRAFT.md')
    outline = read_text(DOCS / 'PROPOSAL_OUTLINE.md')
    roadmap = read_text(DOCS / 'IMPLEMENTATION_ROADMAP.md')
    risk = read_text(DOCS / 'RISK_RESPONSE_PLAN.md')
    estimate = read_text(DOCS / 'ESTIMATE_DRAFT.md')
    rfp_just = read_text(DOCS / 'RFP_MAPPING_JUSTIFICATION.md')
    screenshot_catalog = read_text(DOCS / 'PROPOSAL_SCREENSHOT_CATALOG.md')

    # Remove the "초안" note lines from title
    proposal_draft = re.sub(r'^> 본 문서는 제안서에 바로 붙여넣을 수 있는 문장형 초안입니다\.\n> .*\n', '', proposal_draft)

    final = f"""# 국방지능형플랫폼포털 최종 제안서

> **공식 포털명**: 국방지능형플랫폼포털 / K-Defense Intelligence Platform  
> **보안등급 최종 표준**: `공개` / `내부` / `비밀`  
> **작성일**: 2026-07-05  
> **버전**: 1.0

---

## 요약

국방지능형플랫폼포털은 국방 AI 데이터·모델·프로젝트·도구·크레딧을 하나의 포털에서 통합 관리하는 AI 데이터 운영 플랫폼입니다. Backstage 기반 확장 포털, Keycloak OIDC 인증, OpenSearch 통합검색, OpenMetadata 데이터 거버넌스를 핵심으로 하며, 육해공군별 멀티테넌트, 반입/반출 승인, K-RMF 증빙 관리 등 국방 특화 요구사항을 반영합니다. 본 제안은 PoC에서 구현된 12개 주요 화면과 OpenSearch 연동 성과를 바탕으로 실 운영 구축을 위한 아키텍처·기능·일정·인력을 제시합니다.

---

{proposal_draft}

---

## 11. 요구사항 대응표

### 11.1 기능목록 1~155 매핑 요약

RFP 기능번호는 화면 단위로 다음과 같이 매핑됩니다.

| 화면 | 대응 기능번호 | 캡처 파일 |
|---|---|---|
| 통합 대시보드 | 1~8 | `01-portal-dashboard.png` |
| 통합검색/카탈로그 | 63~79 | `02-integrated-search.png`, `15-openmetadata-catalog.png`, `16-opensearch-catalog-index.png` |
| 프로젝트/워크스페이스 | 80~96 | `03-project-workspace.png` |
| 반입·반출 승인 | 97~108 | `04-export-approval.png` |
| 크레딧 관리 | 109~118 | `05-credit-manager.png` |
| K-RMF 증빙관리 | 91, 109, 135, 142 | `06-krmf-evidence.png` |
| 사용자 관리 | 21~35 | `07-admin-console-user-management.png` |
| 권한/RBAC | 36~44, 56~62 | `08-admin-console-rbac-menu.png` |
| 보안정책/감사로그 | 9~20, 45~55, 135~142 | `09-admin-console-policy-audit.png`, `09-keycloak-login.png` |
| 서비스/도구 카탈로그 | 73~79 | `10-service-catalog.png` |
| 제안 게시판 | 143~149 | `11-proposal-board.png` |
| 마이페이지/환경설정 | 119~134 | `12-my-page.png`, `13-environment-settings.png` |
| 육해공군 멀티테넌트 | 150~155 | `14-tenant-management.png` |

자세한 매핑 근거는 `docs/RFP_MAPPING_JUSTIFICATION.md`를 참조합니다.

### 11.2 미대응 항목 및 후속 계획

PoC 단계에서 실제 연동은 아래 항목을 제외한 화면 및 mock 데이터 기반 로직으로 구현되었습니다.

- Keycloak Admin/Event API 연동
- 실제 DB/API 및 비즈니스 로직
- Kubernetes/OpenStack/CMP 자원 제어
- 파일 저장소 및 DLP/마스킹 연동
- OpenMetadata/OpenSearch 자동 동기화
- 크레딧 차감 및 자원 사용 제한 enforcement

위 항목은 1~4차 구축 로드맵에 따라 순차적으로 보완합니다.

---

## 12. 견적 및 투입인력 산정

주요 내용은 `docs/ESTIMATE_DRAFT.md` 및 `docs/ESTIMATION_TABLE.md`를 참조하며, 핵심 요약은 다음과 같습니다.

- 기능별 개발(화면/Backend/API/연동/테스트/문서): 106.5 M/M
- 공통/인프라/품질관리: 27.0 M/M
- **총합: 133.5 M/M**

자세한 M/M 산정표는 별첨 `국방지능형플랫폼포털_견적산정표.xlsx`를 참조합니다.

---

## 13. 화면 캡처 목록

{screenshot_catalog}

---

## 14. 구현 로드맵

{roadmap}

---

## 15. 리스크 및 대응방안

{risk}

---

## 16. 부록

- `docs/PROPOSAL_OUTLINE.md` — 제안서 목차
- `docs/ESTIMATE_DRAFT.md` — 기능별 견적 초안
- `docs/ESTIMATION_TABLE.md` — M/M 산정 기준
- `docs/RFP_MAPPING_JUSTIFICATION.md` — RFP 매핑 근거
- `docs/IMPLEMENTATION_ROADMAP.md` — 구현 로드맵
- `docs/RISK_RESPONSE_PLAN.md` — 리스크 대응방안
- `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` — 요구사항 추적표
- `docs/SCREEN_TO_RFP_MAPPING.md` — 화면-RFP 매핑
"""
    (DOCS / 'FINAL_PROPOSAL.md').write_text(final, encoding='utf-8')
    (PKG / '국방지능형플랫폼포털_제안서.md').write_text(final, encoding='utf-8')
    print('Wrote FINAL_PROPOSAL.md and proposal-package/국방지능형플랫폼포털_제안서.md')


def build_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    slide_draft = read_text(DOCS / 'PROPOSAL_SLIDE_DRAFT.md')
    _, rows = parse_markdown_table(slide_draft)

    blank_layout = prs.slide_layouts[6]  # blank

    for row in rows:
        slide = prs.slides.add_slide(blank_layout)
        # Title
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.3), Inches(0.8))
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = f"{row.get('Slide','')}. {row.get('제목','')}"
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.name = 'AppleGothic'

        # Key message
        msg_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.2), Inches(7.5), Inches(1.5))
        tf = msg_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = row.get('핵심 메시지','')
        p.font.size = Pt(18)
        p.font.name = 'AppleGothic'

        # Screenshot
        capture = row.get('캡처 파일','').strip()
        if capture and capture != '-':
            # take first file if multiple
            fname = capture.split(',')[0].strip().strip('`')
            img_path = ASSETS / fname
            if img_path.exists():
                try:
                    slide.shapes.add_picture(str(img_path), Inches(0.5), Inches(2.9), width=Inches(7.5))
                except Exception as e:
                    print(f'Could not add image {img_path}: {e}')

        # Notes
        notes_text = row.get('발표 멘트','')
        notes_slide = slide.notes_slide
        notes_text_frame = notes_slide.notes_text_frame
        notes_text_frame.text = notes_text

    out_path = PKG / '국방지능형플랫폼포털_제안발표자료.pptx'
    prs.save(str(out_path))
    print(f'Wrote {out_path} ({len(rows)} slides)')


def build_xlsx():
    wb = Workbook()

    # Sheet 1: 기능별 M/M 산정 (from ESTIMATE_DRAFT)
    ws1 = wb.active
    ws1.title = '기능별 M·M 산정'
    estimate_text = read_text(DOCS / 'ESTIMATE_DRAFT.md')
    # Extract the functional table
    header1, rows1 = parse_markdown_table(estimate_text.split('## 4. 기능별 M/M 산정표')[1].split('## 5.')[0])
    for col, h in enumerate(header1, 1):
        c = ws1.cell(row=1, column=col, value=h)
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for ridx, row in enumerate(rows1, 2):
        for cidx, h in enumerate(header1, 1):
            val = row.get(h, '')
            # numeric where possible
            try:
                if '.' in val:
                    val = float(val)
                else:
                    val = int(val)
            except Exception:
                pass
            ws1.cell(row=ridx, column=cidx, value=val)
    ws1.freeze_panes = 'A2'
    for col in ws1.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                max_len = max(max_len, len(str(cell.value)))
            except Exception:
                pass
        ws1.column_dimensions[col_letter].width = min(max_len + 2, 50)

    # Sheet 2: 공통/인프라
    ws2 = wb.create_sheet('공통_인프라_품질관리')
    common_text = estimate_text.split('## 5. 공통/인프라/품질관리 산정')[1].split('## 6.')[0]
    header2, rows2 = parse_markdown_table(common_text)
    for col, h in enumerate(header2, 1):
        c = ws2.cell(row=1, column=col, value=h)
        c.font = Font(bold=True)
    for ridx, row in enumerate(rows2, 2):
        for cidx, h in enumerate(header2, 1):
            val = row.get(h, '')
            try:
                val = float(val) if '.' in val else int(val)
            except Exception:
                pass
            ws2.cell(row=ridx, column=cidx, value=val)
    for col in ws2.columns:
        col_letter = col[0].column_letter
        ws2.column_dimensions[col_letter].width = 20

    # Sheet 3: 총 M/M 요약
    ws3 = wb.create_sheet('총 M·M 요약')
    ws3.append(['구분', 'M/M'])
    ws3.append(['기능별 개발 (화면/Backend/연동/테스트/문서)', 106.5])
    ws3.append(['공통/인프라/품질관리', 27.0])
    ws3.append(['합계', 133.5])
    for row in ws3.iter_rows():
        for cell in row:
            if cell.row == 1 or cell.column == 1:
                cell.font = Font(bold=True)
            if cell.value == '합계':
                cell.font = Font(bold=True)

    # Sheet 4: 역할별 M/M
    ws4 = wb.create_sheet('역할별 M·M')
    role_text = estimate_text.split('## 7. 역할별 M/M 분배 예시')[1].split('## 8.')[0]
    header4, rows4 = parse_markdown_table(role_text)
    for col, h in enumerate(header4, 1):
        ws4.cell(row=1, column=col, value=h).font = Font(bold=True)
    for ridx, row in enumerate(rows4, 2):
        for cidx, h in enumerate(header4, 1):
            val = row.get(h, '')
            try:
                val = float(val) if '.' in val else int(val)
            except Exception:
                pass
            ws4.cell(row=ridx, column=cidx, value=val)

    # Sheet 5: 기능목록 1~155 매핑 (from ESTIMATION_TABLE)
    ws5 = wb.create_sheet('기능목록 1~155 매핑')
    est_table = read_text(DOCS / 'ESTIMATION_TABLE.md')
    header5, rows5 = parse_markdown_table(est_table.split('## 2. 기능별 M/M 산정')[1].split('## 3.')[0])
    for col, h in enumerate(header5, 1):
        ws5.cell(row=1, column=col, value=h).font = Font(bold=True)
    for ridx, row in enumerate(rows5, 2):
        for cidx, h in enumerate(header5, 1):
            ws5.cell(row=ridx, column=cidx, value=row.get(h, ''))
    ws5.freeze_panes = 'A2'

    out_path = PKG / '국방지능형플랫폼포털_견적산정표.xlsx'
    wb.save(str(out_path))
    print(f'Wrote {out_path}')


if __name__ == '__main__':
    build_final_proposal()
    build_pptx()
    build_xlsx()
