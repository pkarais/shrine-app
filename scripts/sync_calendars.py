import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime

def fetch_goa_chapel():
    url = "https://www.goarch.org/chapel"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    res = requests.get(url, headers=headers, timeout=30)
    res.raise_for_status()
    return res.text

def parse_commemorations(html):
    soup = BeautifulSoup(html, "html.parser")
    commemorations = []
    readings = []

    commem_section = soup.find(id="commemorations") or soup.find(class_="commemorations")
    if not commem_section:
        divs = soup.find_all("div", class_=lambda c: c and "commem" in c.lower())
        if divs:
            commem_section = divs[0]

    if commem_section:
        for li in commem_section.find_all("li"):
            text = li.get_text(strip=True)
            if text:
                commemorations.append(text)
        if not commemorations:
            for p in commem_section.find_all("p"):
                text = p.get_text(strip=True)
                if text:
                    commemorations.append(text)

    readings_section = soup.find(id="readings") or soup.find(class_="readings")
    if not readings_section:
        divs = soup.find_all("div", class_=lambda c: c and "reading" in c.lower())
        if divs:
            readings_section = divs[0]

    if readings_section:
        for li in readings_section.find_all("li"):
            text = li.get_text(strip=True)
            if text:
                readings.append(text)
        if not readings:
            for p in readings_section.find_all("p"):
                text = p.get_text(strip=True)
                if text:
                    readings.append(text)

    if not commemorations:
        content_area = soup.find(id="content") or soup.find("main") or soup.find(class_="content")
        if content_area:
            for elem in content_area.find_all(["h2", "h3", "h4"]):
                text = elem.get_text(strip=True)
                if text and any(kw in text.lower() for kw in ["commemorat", "saint", "feast", "synaxar"]):
                    sibling = elem.find_next_sibling("p")
                    if sibling:
                        commemorations.append(sibling.get_text(strip=True))

    return commemorations, readings

def sync():
    print("Fetching GOA chapel page...")
    html = fetch_goa_chapel()

    print("Parsing commemorations and readings...")
    commemorations, readings = parse_commemorations(html)

    today = datetime.now().strftime("%Y-%m-%d")
    data = {
        "date": today,
        "commemorations": commemorations,
        "readings": readings,
        "fetched_at": datetime.now().isoformat(),
    }

    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "goa-today.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Written {len(commemorations)} commemorations and {len(readings)} readings to {output_path}")

if __name__ == "__main__":
    sync()
