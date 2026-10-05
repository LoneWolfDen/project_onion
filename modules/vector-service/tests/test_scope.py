import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import scope  # noqa: E402


class PersonaTests(unittest.TestCase):
    def test_server_persona_wins_over_the_browser(self):
        self.assertEqual(scope.resolve_persona("Bo", {"ONION_PERSONA": "Ana"}), ("Ana", "server-derived"))

    def test_pilot_mode_honours_the_browser_and_says_so(self):
        self.assertEqual(scope.resolve_persona("Bo", {}), ("Bo", "client-supplied"))

    def test_no_persona_anywhere_is_refused(self):
        with self.assertRaises(scope.ScopeError):
            scope.resolve_persona("", {})


class ProjectTests(unittest.TestCase):
    def test_wildcards_are_refused_by_default(self):
        for p in ("", "  ", "default", "ALL", None):
            with self.assertRaises(scope.ScopeError):
                scope.require_project(p, {})

    def test_wildcards_allowed_only_with_the_debug_flag(self):
        self.assertEqual(scope.require_project("all", {"ONION_ALLOW_ALL_PROJECTS": "1"}), "all")

    def test_real_project_passes(self):
        self.assertEqual(scope.require_project(" P-1 ", {}), "P-1")


class PrivacyTests(unittest.TestCase):
    def test_metadata_states_privacy_and_persona_source(self):
        m = scope.stamp_metadata({"is_private": True, "author": "Ana"}, "server-derived")
        self.assertEqual((m["privacy"], m["persona_source"]), ("private", "server-derived"))
        self.assertEqual(scope.stamp_metadata({"is_private": False}, "client-supplied")["privacy"], "shared")

    def test_listing_hides_other_peoples_private_cards(self):
        cards = [
            {"id": "shared", "metadata": {"is_private": False, "author": "Bo"}},
            {"id": "mine", "metadata": {"is_private": True, "author": "Ana"}},
            {"id": "theirs", "metadata": {"is_private": True, "author": "Bo"}},
            {"id": "nometa"},
        ]
        self.assertEqual([c["id"] for c in scope.filter_listing(cards, "Ana")], ["shared", "mine", "nometa"])


if __name__ == "__main__":
    unittest.main()
