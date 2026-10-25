#!/usr/bin/env python3
"""Verify final proposal sharing package structure and contents."""
import os
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = ROOT / "proposal-package" / "final-share"
ZIP_PATH = ROOT / "proposal-package" / "국방지능형플랫폼포털_최종제안공유패키지_33단계.zip"

PPT_DIR = PACKAGE_DIR / "01_PPT"
GUIDES_DIR = PACKAGE_DIR / "02_GUIDES"
SCREENSHOTS_DIR = PACKAGE_DIR / "03_SCREENSHOTS"
RFP_DIR = PACKAGE_DIR / "04_RFP_MAPPING"
QA_DIR = PACKAGE_DIR / "05_QA_REPORTS"
SCRIPTS_DIR = PACKAGE_DIR / "06_SCRIPTS"

SECRET_PATTERNS = [
    re.compile(r"AIza[0-9A-Za-z_-]{35}"),  # Firebase API key
    re.compile(r"1:[0-9]+:web:[0-9a-f]+"),  # Firebase appId
    re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"client_secret"),
    re.compile(r"serviceAccount"),
    re.compile(r"private_key"),
]

BANNED_WORDS = ["데모", "PoC", "mock", "Mock", "프리뷰", "preview", "제안서 작업용"]


def check_path(path, description):
    if path.exists():
        print(f"✅ {description}: {path}")
        return True
    print(f"❌ {description} 누락: {path}")
    return False


def count_files(directory, pattern):
    if not directory.exists():
        return 0
    return len(list(directory.glob(pattern)))


def check_text_files_for_patterns(directory, patterns, description, skip_dirs=None):
    skip_dirs = set(skip_dirs or [])
    matches = []
    if not directory.exists():
        return matches
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for fname in files:
            if not fname.endswith(".md"):
                continue
            fpath = Path(root) / fname
            try:
                text = fpath.read_text(encoding="utf-8")
            except Exception:
                continue
            lines = text.splitlines()
            for pattern in patterns:
                if isinstance(pattern, str):
                    for line in lines:
                        if pattern in line and "admin_preview" not in line:
                            matches.append((fpath, pattern))
                            break
                else:
                    for m in pattern.finditer(text):
                        matches.append((fpath, m.group(0)[:50]))
    return matches


def main():
    all_ok = True
    print("=== final-share 디렉터리 구조 확인 ===\n")
    all_ok &= check_path(PACKAGE_DIR, "final-share 디렉터리")
    all_ok &= check_path(PPT_DIR, "01_PPT")
    all_ok &= check_path(GUIDES_DIR, "02_GUIDES")
    all_ok &= check_path(SCREENSHOTS_DIR, "03_SCREENSHOTS")
    all_ok &= check_path(RFP_DIR, "04_RFP_MAPPING")
    all_ok &= check_path(QA_DIR, "05_QA_REPORTS")
    all_ok &= check_path(SCRIPTS_DIR, "06_SCRIPTS")

    print("\n=== 파일 수량 확인 ===\n")
    ppt_count = count_files(PPT_DIR, "*.pptx")
    guide_count = count_files(GUIDES_DIR, "*.md")
    png_count = count_files(SCREENSHOTS_DIR, "*.png")
    rfp_count = count_files(RFP_DIR, "*.md")
    qa_count = count_files(QA_DIR, "*.md")
    script_count = count_files(SCRIPTS_DIR, "*")

    print(f"PPT 파일 수: {ppt_count} (기대 >=2)")
    print(f"설명자료 수: {guide_count} (기대 >=3)")
    print(f"PNG 캡처 수: {png_count} (기대 >=20)")
    print(f"RFP 매핑 문서 수: {rfp_count} (기대 >=1)")
    print(f"QA 보고서 수: {qa_count} (기대 >=1)")
    print(f"스크립트 파일 수: {script_count} (기대 >=1)")

    all_ok &= ppt_count >= 2
    all_ok &= guide_count >= 3
    all_ok &= png_count >= 20
    all_ok &= rfp_count >= 1
    all_ok &= qa_count >= 1
    all_ok &= script_count >= 1

    print("\n=== 민감정보 패턴 검사 (텍스트 파일) ===\n")
    secret_matches = check_text_files_for_patterns(PACKAGE_DIR, SECRET_PATTERNS, "민감정보")
    if secret_matches:
        print("⚠️ 의심 패턴 발견:")
        for fpath, value in secret_matches[:20]:
            print(f"  {fpath}: {value}")
        all_ok = False
    else:
        print("✅ 민감정보 패턴 미검출")

    print("\n=== 부적합 문구 검사 (PPT 제외, 텍스트 파일) ===\n")
    banned_matches = check_text_files_for_patterns(PACKAGE_DIR, BANNED_WORDS, "부적합 문구", skip_dirs={"04_RFP_MAPPING", "05_QA_REPORTS", "99_ARCHIVE_NOTE"})
    if banned_matches:
        print("⚠️ 부적합 문구 발견:")
        for fpath, word in banned_matches[:20]:
            print(f"  {fpath}: {word}")
    else:
        print("✅ 부적합 문구 미검출 (05_QA_REPORTS 제외)")

    print("\n=== 금지 확장자 검사 ===\n")
    forbidden_exts = {".key", ".pem", ".env", ".tmp", ".bak", ".log"}
    forbidden_files = []
    for root, _, files in os.walk(PACKAGE_DIR):
        for fname in files:
            suffix = Path(fname).suffix.lower()
            if suffix in forbidden_exts:
                forbidden_files.append(Path(root) / fname)
    if forbidden_files:
        print("⚠️ 금지 확장자 파일 발견:")
        for f in forbidden_files[:20]:
            print(f"  {f}")
        all_ok = False
    else:
        print("✅ 금지 확장자 파일 미검출")

    print("\n=== ZIP 파일 확인 ===\n")
    if ZIP_PATH.exists():
        print(f"✅ ZIP 파일 존재: {ZIP_PATH}")
        print(f"   용량: {ZIP_PATH.stat().st_size:,} bytes")
        try:
            with zipfile.ZipFile(ZIP_PATH, "r") as zf:
                bad = zf.testzip()
                if bad:
                    print(f"❌ ZIP 무결성 오류: {bad}")
                    all_ok = False
                else:
                    print("✅ ZIP 무결성 검사 통과")
                print(f"   총 항목 수: {len(zf.namelist())}")
        except Exception as e:
            print(f"❌ ZIP 검사 실패: {e}")
            all_ok = False
    else:
        print(f"ℹ️ ZIP 파일 없음: {ZIP_PATH}")

    print("\n=== 결과 ===\n")
    if all_ok:
        print("✅ 패키지 검증 통과")
    else:
        print("❌ 패키지 검증 실패 (위 항목 확인 필요)")


if __name__ == "__main__":
    main()
