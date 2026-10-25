#!/usr/bin/env python3
"""Generate proposal PPT with screenshots and RFP mapping."""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

KOREAN_FONT = "Apple SD Gothic Neo"
TITLE_COLOR = RGBColor(0x0D, 0x47, 0x21)
ACCENT_COLOR = RGBColor(0x1B, 0x5E, 0x20)
TEXT_COLOR = RGBColor(0x33, 0x33, 0x33)


def set_font(run, size=Pt(14), bold=False, color=TEXT_COLOR):
    run.font.size = size
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = KOREAN_FONT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "docs", "assets", "final")
OUT_PATH = os.path.join(ROOT, "proposal-package", "국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx")


def add_title_slide(prs):
    slide_layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(slide_layout)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(2.2), Inches(12.333), Inches(1.5))
    tf = title_box.text_frame
    tf.text = "국방지능형플랫폼포털 RFP 대응 제안 발표자료"
    p = tf.paragraphs[0]
    set_font(p.runs[0], size=Pt(40), bold=True, color=TITLE_COLOR)
    p.alignment = PP_ALIGN.CENTER

    sub_box = slide.shapes.add_textbox(Inches(0.5), Inches(4.0), Inches(12.333), Inches(1.0))
    stf = sub_box.text_frame
    stf.text = "21개 SFR · 163개 기능목록 대응 화면 및 구현 수준 정리\n2026-07-13"
    sp = stf.paragraphs[0]
    set_font(sp.runs[0], size=Pt(20), color=TEXT_COLOR)
    sp.alignment = PP_ALIGN.CENTER


def add_overview_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    title = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.8))
    tf = title.text_frame
    tf.text = "포털 역할 및 제안 핵심 메시지"
    p = tf.paragraphs[0]
    set_font(p.runs[0], size=Pt(28), bold=True, color=TITLE_COLOR)

    body = slide.shapes.add_textbox(Inches(0.7), Inches(1.3), Inches(12.0), Inches(5.5))
    btf = body.text_frame
    btf.word_wrap = True
    messages = [
        "국방지능형플랫폼포털은 데이터 플랫폼, AI 플랫폼, 지능형 클라우드/CMP를 직접 대체하는 시스템이 아닙니다.",
        "포털은 사용자가 하나의 접점에서 각 플랫폼을 안전하게 접근·신청·조회·승인·연계할 수 있도록 지원하는 통합 진입점이자 업무 오케스트레이션 계층입니다.",
        "RFP의 21개 SFR과 163개 기능목록은 포털 메뉴, 화면, 플랫폼 연계 설계안과 명확히 매핑되어 있습니다.",
        "관리자 전용 '요구사항 대응현황' 화면에서 메뉴/SFR/기능 단위로 구현 현황을 추적할 수 있습니다.",
        "본 사업 초기 단계에서 정의된 API/연계 후보는 실제 확정 명세가 아니며, 사업 착수 후 상세설계에서 확정됩니다.",
    ]
    for i, msg in enumerate(messages):
        if i == 0:
            para = btf.paragraphs[0]
        else:
            para = btf.add_paragraph()
        para.text = msg
        set_font(para.runs[0], size=Pt(18), color=RGBColor(0x22, 0x22, 0x22))
        para.space_after = Pt(14)


def add_content_slide(prs, data, slide_num=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # Title bar
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(0.95)
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = TITLE_COLOR
    bar.line.fill.background()

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.4), Inches(0.2), Inches(12.5), Inches(0.6))
    tf = title_box.text_frame
    tf.text = f"{data['screen_name']} — {data['rfp_ids']}"
    p = tf.paragraphs[0]
    set_font(p.runs[0], size=Pt(24), bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))

    # Footer
    if slide_num is not None:
        footer = slide.shapes.add_textbox(Inches(0.4), Inches(7.1), Inches(12.5), Inches(0.3))
        ftf = footer.text_frame
        ftf.text = f"국방지능형플랫폼포털  |  {slide_num}"
        fp = ftf.paragraphs[0]
        fp.alignment = PP_ALIGN.RIGHT
        set_font(fp.runs[0], size=Pt(10), color=RGBColor(0x88, 0x88, 0x88))

    # Left content
    left = Inches(0.4)
    top = Inches(1.05)
    width = Inches(5.4)
    height = Inches(6.0)
    content_box = slide.shapes.add_textbox(left, top, width, height)
    ctf = content_box.text_frame
    ctf.word_wrap = True

    sections = [
        ("RFP ID", data["rfp_ids"]),
        ("요구사항명", data["req_name"]),
        ("요구내용", data["req_content"]),
        ("대응 화면", f"{data['screen_name']} ({data['screen_route']})"),
        ("구현 기능", "\n".join(f"• {f}" for f in data["features"])),
        ("구현 수준", data["impl_level"]),
        ("후속 연동 범위", data["follow_up"]),
    ]

    for i, (label, value) in enumerate(sections):
        if i == 0:
            para = ctf.paragraphs[0]
        else:
            para = ctf.add_paragraph()
        para.text = f"{label}: "
        set_font(para.runs[0], size=Pt(14), bold=True, color=ACCENT_COLOR)
        para.space_after = Pt(2)

        val_para = ctf.add_paragraph()
        val_para.text = value
        set_font(val_para.runs[0], size=Pt(13), color=TEXT_COLOR)
        val_para.space_after = Pt(8)
        val_para.level = 0

    # Right image
    img_path = os.path.join(IMG_DIR, data["image_file"])
    if os.path.exists(img_path):
        img_left = Inches(6.0)
        img_top = Inches(1.05)
        img_max_height = Inches(6.0)
        img_max_width = Inches(7.0)
        pic = slide.shapes.add_picture(img_path, img_left, img_top, height=img_max_height)
        if pic.width > img_max_width:
            ratio = img_max_width / pic.width
            pic.width = img_max_width
            pic.height = int(pic.height * ratio)
    else:
        missing = slide.shapes.add_textbox(Inches(6.0), Inches(3.0), Inches(7.0), Inches(1.0))
        mtf = missing.text_frame
        mtf.text = f"캡처 이미지 없음:\n{data['image_file']}"
        mp = mtf.paragraphs[0]
        set_font(mp.runs[0], size=Pt(14), color=RGBColor(0x99, 0x00, 0x00))


def add_summary_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    title = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.8))
    tf = title.text_frame
    tf.text = "구현 수준 요약 및 후속 로드맵"
    p = tf.paragraphs[0]
    set_font(p.runs[0], size=Pt(28), bold=True, color=TITLE_COLOR)

    body = slide.shapes.add_textbox(Inches(0.7), Inches(1.3), Inches(12.0), Inches(5.5))
    btf = body.text_frame
    btf.word_wrap = True
    lines = [
        "• 화면 구현: 19개 핵심 화면 모두 UI/UX 구현 완료",
        "• 관리자 전용 기능: 요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오 포함",
        "• 연동 현황: OpenSearch proxy, OpenMetadata UI, Keycloak OIDC 연동 확인",
        "• 데이터 기반: 사용자/프로젝트/반출/크레딧/카탈로그 등은 샘플 데이터 기반으로 화면 검증 완료",
        "• 후속 단계: 실제 DB/API/Keycloak Admin/Kubernetes/OpenStack/CMP/파일 저장소 연동 및 감사로그 DB 구축",
    ]
    for i, line in enumerate(lines):
        if i == 0:
            para = btf.paragraphs[0]
        else:
            para = btf.add_paragraph()
        para.text = line
        set_font(para.runs[0], size=Pt(20), color=RGBColor(0x22, 0x22, 0x22))
        para.space_after = Pt(12)


def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    add_title_slide(prs)
    add_overview_slide(prs)

    slides_data = [
        {
            "screen_name": "통합 대시보드",
            "screen_route": "/",
            "rfp_ids": "RFP-001~008",
            "req_name": "SFR-001 국방 지능형플랫폼 메인 포털 / SFR-012 플랫폼 연동",
            "req_content": "포털 메인 화면은 플랫폼 전체 현황을 요약하고, 데이터셋·AI 모델·프로젝트·크레딧·K-RMF·시스템 상태를 한 눈에 보여주며 공지사항 및 Quick Links를 통한 메뉴 접근성을 제공합니다.",
            "features": ["통합 대시보드 요약 카드", "공지사항 / Quick Links", "통합검색 진입", "시스템 상태 패널"],
            "impl_level": "화면 구현 완료",
            "follow_up": "실시간 플랫폼 상태 API 연동, 개인화 위젯, 알림 연동",
            "image_file": "01-portal-dashboard.png",
        },
        {
            "screen_name": "통합검색",
            "screen_route": "/integrated-search",
            "rfp_ids": "RFP-063~072",
            "req_name": "SFR-014 카탈로그 조회 / SFR-015 통합검색",
            "req_content": "데이터셋·AI 모델·Docker 이미지·PyPI 패키지·문서를 보안등급과 유형 중심으로 통합 검색하고, 메타데이터 상세 정보를 조회합니다.",
            "features": ["통합 검색어 입력", "검색 대상 유형/보안등급/소스/태그 필터", "OpenSearch proxy 연동", "메타데이터 상세 패널"],
            "impl_level": "화면 구현 완료 (OpenSearch proxy 연동, 샘플 데이터 fallback)",
            "follow_up": "운영 OpenSearch 인스턴스 연동, 권한/보안등급 기반 결과 필터, 임베딩 기반 유사도 검색",
            "image_file": "02-integrated-search.png",
        },
        {
            "screen_name": "서비스/도구 카탈로그",
            "screen_route": "/service-catalog",
            "rfp_ids": "RFP-073~079",
            "req_name": "SFR-007 AI 작업 환경 생성 요청 / SFR-008 데이터 작업 환경 생성 요청 / SFR-014 카탈로그 조회",
            "req_content": "AI 개발에 필요한 분석/개발/데이터/시각화/라벨링 도구를 카탈로그 형태로 조회·선택·요청하고, 워크스페이스에 적용할 수 있습니다.",
            "features": ["도구 카테고리 탭", "도구 목록/상세", "도구 선택 및 직접 입력 요청", "요구사항 대응 현황 연계"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "OpenMetadata/Docker/PyPI 실제 연동, 도구 요청 workflow, 승인/배포 연계",
            "image_file": "10-service-catalog.png",
        },
        {
            "screen_name": "프로젝트/워크스페이스",
            "screen_route": "/project-workspace",
            "rfp_ids": "RFP-080~096",
            "req_name": "SFR-016 프로젝트 관리 / SFR-018 워크스페이스 관리 요청",
            "req_content": "AI 연구/개발 프로젝트를 등록·조회하고, 멤버·워크스페이스·자원을 신청·관리할 수 있습니다.",
            "features": ["프로젝트 목록/상세", "멤버 및 리소스 할당", "워크스페이스 생성 신청", "승인 이력"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "프로젝트 DB/API 연동, Keycloak 그룹 연동, CMP/Kubernetes 워크스페이스 연동",
            "image_file": "03-project-workspace.png",
        },
        {
            "screen_name": "반입·반출 승인",
            "screen_route": "/export-approval",
            "rfp_ids": "RFP-097~108",
            "req_name": "SFR-009 프로젝트 반출입서버 관리 / SFR-010 AI 개발 성과 반출 관리 / SFR-011 데이터 분석 성과 반출 관리 / SFR-012 플랫폼 연동",
            "req_content": "데이터 반입/반출에 대한 신청·승인·보안 검토 workflow를 지원하고 이력을 관리합니다.",
            "features": ["반입/반출 신청 목록", "신청 등록 및 보안등급 설정", "승인/반려 workflow", "이력 및 감사 연계"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "실제 승인 workflow, 파일 저장소 연동, 보안 검토 API, 감사로그 DB",
            "image_file": "04-export-approval.png",
        },
        {
            "screen_name": "크레딧 관리",
            "screen_route": "/credit-manager",
            "rfp_ids": "RFP-109~118",
            "req_name": "SFR-017 크레딧 신청 및 조회 / SFR-018 워크스페이스 관리 요청",
            "req_content": "프로젝트별 크레딧을 할당하고 GPU/CPU/스토리지 사용량을 모니터링하며, 부족/과다 사용 경고를 제공합니다.",
            "features": ["프로젝트별 크레딧 잔액/사용량", "충전/사용 이력", "자원별 단가 설정", "부족 알림 패널"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "AI/큐브/클우드 사용량 수집 API 연동, 크레딧 차감 및 자원 제한 enforcement",
            "image_file": "05-credit-manager.png",
        },
        {
            "screen_name": "K-RMF 증빙관리",
            "screen_route": "/krmf-evidence",
            "rfp_ids": "RFP-091, 109, 135, 142",
            "req_name": "SFR-002 메인 포털 로그인/로그아웃 / SFR-004 메인 포털 관리 - 정책 및 이력 관리",
            "req_content": "K-RMF 평가 항목별 증빙 자료를 등록·조회·관리하고 감사 및 설정 변경 이력과 연계합니다.",
            "features": ["K-RMF 통제항목 목록", "증빙 자료 등록/조회", "보안 미흡사항 조치관리", "통합진척률 대시보드"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "K-RMF 평가 DB 연동, 증빙 파일 저장소, 감사이력 자동 연계",
            "image_file": "06-krmf-evidence.png",
        },
        {
            "screen_name": "마이페이지",
            "screen_route": "/my-page",
            "rfp_ids": "RFP-119~130",
            "req_name": "SFR-019 마이페이지",
            "req_content": "사용자가 개인 정보·활동·프로젝트·자원 사용·크레딧 내역을 관리할 수 있습니다.",
            "features": ["프로필/이메일/비밀번호/세션", "내 프로젝트/자원/크레딧 이력", "알림 설정", "API Key 관리"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "Keycloak/DB 연동, 알림 서비스, API Key Vault, 개인정보 마스킹",
            "image_file": "12-my-page.png",
        },
        {
            "screen_name": "환경설정",
            "screen_route": "/environment-settings",
            "rfp_ids": "RFP-131~134",
            "req_name": "SFR-020 환경설정",
            "req_content": "운영자가 시스템 파라미터·보안 정책·자원 할당 기준을 관리하고 변경 이력을 조회합니다.",
            "features": ["시스템 파라미터", "보안 정책", "자원할당 기준", "변경 이력"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "운영 설정 DB/정책 엔진 연동, 변경 이력 감사로그",
            "image_file": "13-environment-settings.png",
        },
        {
            "screen_name": "육해공군 관리",
            "screen_route": "/tenant-management",
            "rfp_ids": "RFP-150~155",
            "req_name": "SFR-021 육해공군 관리자 권한 관리",
            "req_content": "육해공군별 관리자 권한·리소스 풀·쿼터·사용량을 통합 관리하고 필요 시 권한을 위임합니다.",
            "features": ["군별 테넌트 개요", "위임관리", "리소스 풀/쿼터", "사용량 대시보드", "경계정책"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "Kubernetes namespace/quota, OpenStack project/quota, CMP API, Keycloak group/role 연동",
            "image_file": "14-tenant-management.png",
        },
        {
            "screen_name": "제안 게시판",
            "screen_route": "/proposal-board",
            "rfp_ids": "RFP-143~149",
            "req_name": "SFR-013 제안게시판",
            "req_content": "사용자가 AI 데이터/도구/정책 아이디어를 제안하고 관리자가 승인·공지할 수 있습니다.",
            "features": ["제안 목록/상세", "제안 등록", "공감/추천/관심/댓글", "관리자 검토"],
            "impl_level": "화면 구현 완료 (샘플 데이터 기반)",
            "follow_up": "제안 DB, 알림/메일, 승인 workflow, 공지 연동",
            "image_file": "11-proposal-board.png",
        },
        {
            "screen_name": "관리자 콘솔 – 사용자 관리",
            "screen_route": "/admin-console",
            "rfp_ids": "RFP-021~035",
            "req_name": "SFR-003 메인 포털 관리 - 사용자 관리",
            "req_content": "관리자가 사용자 등록·승인·외부 사용자·조직을 관리하는 중앙 화면입니다.",
            "features": ["사용자 등록 신청/승인/반려", "사용자/외부 사용자 목록 및 상세", "조직/부서 관리", "상태 변경 이력"],
            "impl_level": "화면 구현 완료 (관리자 전용, 샘플 데이터 기반)",
            "follow_up": "Keycloak Admin API, 조직/부서 DB, 승인 workflow",
            "image_file": "07-admin-console-user-management.png",
        },
        {
            "screen_name": "관리자 콘솔 – 권한/RBAC",
            "screen_route": "/admin-console",
            "rfp_ids": "RFP-036~044, 056~062",
            "req_name": "SFR-005 메인 포털 관리 - 권한 관리 / SFR-006 프로그램 및 메뉴 관리",
            "req_content": "역할·그룹·메뉴·데이터·서비스·프로젝트 단위로 세밀한 접근 제어를 설정합니다.",
            "features": ["역할/그룹 관리", "역할별 권한 매트릭스", "사용자/그룹 매핑", "메뉴/프로그램 관리"],
            "impl_level": "화면 구현 완료 (관리자 전용, 샘플 데이터 기반)",
            "follow_up": "Keycloak role/group claim, Backstage permission 정책, 메뉴 권한 연동",
            "image_file": "08-admin-console-rbac-menu.png",
        },
        {
            "screen_name": "관리자 콘솔 – 정책/감사",
            "screen_route": "/admin-console",
            "rfp_ids": "RFP-009~020, 045~055, 135~142",
            "req_name": "SFR-002 메인 포털 로그인/로그아웃 / SFR-004 정책 및 이력 관리",
            "req_content": "로그인·비밀번호·세션 정책을 설정하고 관리자/사용자 행위를 감사합니다.",
            "features": ["로그인/비밀번호 정책", "세션/자동로그아웃 정책", "감사로그 대시보드", "로그인/로그아웃/설정 변경 이력"],
            "impl_level": "화면 구현 완료 (관리자 전용, 샘플 데이터 기반)",
            "follow_up": "Keycloak 정책 연동, 감사로그 DB, 중앙 로그 수집",
            "image_file": "09-admin-console-policy-audit.png",
        },
        {
            "screen_name": "요구사항 대응현황",
            "screen_route": "/requirement-coverage",
            "rfp_ids": "RFP-001~163",
            "req_name": "SFR-001~SFR-021 전체 추적",
            "req_content": "사전규격 기준 163개 기능목록과 21개 SFR의 UI 구현 현황을 메뉴/SFR/기능 단위로 체계적으로 조회합니다.",
            "features": ["메뉴 대응현황", "SFR 대응현황", "기능 대응현황", "변경이력/질의사항", "CSV 다운로드"],
            "impl_level": "화면 구현 완료 (관리자 전용, 샘플 데이터 기반)",
            "follow_up": "RFP 확정 후 데이터 갱신, 사업관리자용 추적 도구로 활용",
            "image_file": "17-requirement-coverage.png",
        },
        {
            "screen_name": "플랫폼 API 연계현황",
            "screen_route": "/platform-api-integration",
            "rfp_ids": "RFP-156~158 (플랫폼 연동)",
            "req_name": "SFR-012 플랫폼 연동",
            "req_content": "포털-데이터/AI/클리우드/인증/보안 플랫폼 간 연계 후보를 API/이벤트/파일 단위로 정의하고 관리합니다.",
            "features": ["연계 후보 목록", "API/이벤트/파일 연계 구분", "연계 플랫폼/메뉴/SFR 매핑", "CSV 다운로드"],
            "impl_level": "화면 구현 완료 (관리자 전용, 설계안/후보 목록 기반)",
            "follow_up": "각 플랫폼 담당 팀과 인터페이스 정의서 확정 및 실제 연동 개발",
            "image_file": "18-platform-api-integration.png",
        },
        {
            "screen_name": "업무흐름/연계 시나리오",
            "screen_route": "/workflow-scenarios",
            "rfp_ids": "RFP-001~163 전반",
            "req_name": "SFR-001, SFR-012, SFR-014, SFR-016, SFR-017, SFR-018, SFR-021",
            "req_content": "데이터 엔지니어부터 군별 관리자, 보안 관리자, 사업관리자까지 각 사용자가 포털과 플랫폼을 어떻게 사용하는지 시각화합니다.",
            "features": ["포털 역할 요약", "7개 사용자 여정", "7개 업무흐름 시나리오", "단계별 플랫폼/API/RFP 매핑"],
            "impl_level": "화면 구현 완료 (관리자 전용, 시나리오 데이터 기반)",
            "follow_up": "실제 업무흐름 반영, 특정 시나리오 직접 링크(URL query param)",
            "image_file": "19-workflow-scenarios.png",
        },
        {
            "screen_name": "관리자 콘솔 – 플랫폼 운영도구",
            "screen_route": "/admin-console",
            "rfp_ids": "RFP-003~006",
            "req_name": "메인 포털 관리 - 플랫폼 운영도구 통합 링크",
            "req_content": "OpenMetadata, OpenSearch 대시보드, Keycloak 관리 등 외부 운영도구를 관리자 전용으로 집중 제공합니다.",
            "features": ["OpenMetadata 메타데이터 관리", "OpenSearch 대시보드 모니터링", "Keycloak 인증·인가 관리", "관리자 전용 접근 제어"],
            "impl_level": "화면 구현 완료 (관리자 전용, 외부 도구 링크)",
            "follow_up": "환경별 외부 도구 URL 설정, SSO 연동",
            "image_file": "09-admin-console-platform-ops-tools.png",
        },
        {
            "screen_name": "Keycloak 로그인",
            "screen_route": "http://localhost:8080",
            "rfp_ids": "RFP-009~020, 045~055",
            "req_name": "SFR-002 메인 포털 로그인/로그아웃",
            "req_content": "Keycloak 기반 OIDC 인증과 비밀번호·세션·MFA 정책을 제공합니다.",
            "features": ["OIDC 로그인", "비밀번호 정책", "세션 정책", "MFA"],
            "impl_level": "Keycloak OIDC 연동 확인 완료",
            "follow_up": "운영 Keycloak Realm, MFA, PKI/MPKI 연동",
            "image_file": "09-keycloak-login.png",
        },
        {
            "screen_name": "Backstage 로그인 선택",
            "screen_route": "/",
            "rfp_ids": "RFP-009~012",
            "req_name": "SFR-002 메인 포털 로그인/로그아웃",
            "req_content": "Backstage 통합 로그인 포털에서 OIDC 또는 게스트 로그인을 선택할 수 있습니다.",
            "features": ["OIDC 로그인 버튼", "Guest 로그인", "통합 로그인 포털"],
            "impl_level": "Backstage 기본 로그인 UI 활용 완료",
            "follow_up": "Keycloak OIDC provider 연동, SSO",
            "image_file": "09-backstage-signin.png",
        },
    ]

    for i, data in enumerate(slides_data, start=3):
        add_content_slide(prs, data, slide_num=i)

    add_summary_slide(prs)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    prs.save(OUT_PATH)
    print(f"Saved proposal PPT: {OUT_PATH}")


if __name__ == "__main__":
    main()
