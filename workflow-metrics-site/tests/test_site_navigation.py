import unittest
from html.parser import HTMLParser
from pathlib import Path


DIST = Path(__file__).resolve().parents[1] / "dist"


class Links(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.in_aside = False
        self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        if tag == "aside":
            self.in_aside = True
        if tag == "a":
            self.links.append((dict(attrs).get("href", ""), self.in_aside))

    def handle_endtag(self, tag):
        if tag == "aside":
            self.in_aside = False


class SiteNavigationTests(unittest.TestCase):
    def test_metrics_has_static_optimization_navigation(self):
        links = Links((DIST / "index.html").read_text(encoding="utf-8")).links
        self.assertTrue(any(href == "./optimization.html" and aside
                            for href, aside in links))

    def test_optimization_entry_is_available_outside_hidden_mobile_sidebar(self):
        links = Links((DIST / "index.html").read_text(encoding="utf-8")).links
        self.assertTrue(any(href == "./optimization.html" and not aside
                            for href, aside in links))

    def test_optimization_can_return_to_metrics(self):
        links = Links((DIST / "optimization.html").read_text(encoding="utf-8")).links
        self.assertTrue(any(href == "./index.html#overview" and not aside
                            for href, aside in links))


if __name__ == "__main__":
    unittest.main()
