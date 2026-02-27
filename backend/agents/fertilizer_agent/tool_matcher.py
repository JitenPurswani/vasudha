"""
Tool Matcher — Stage 4 of the Fertilizer Recommendation Pipeline
Maps each recommended fertilizer's application method(s) to specific tools,
including purchase links. This drives the flip-card UI on the frontend.
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "tools.json"), "r") as f:
    TOOLS_DB = json.load(f)

with open(os.path.join(BASE_DIR, "tool_purchase_links.json"), "r") as f:
    PURCHASE_LINKS_DB = json.load(f)


def _get_tools_for_method(method_id: str) -> list[dict]:
    """
    Look up tools for a given application method.
    Returns a list of tool dicts with purchase links attached.
    """
    methods = TOOLS_DB.get("methods", {})
    method_data = methods.get(method_id)
    if not method_data:
        return []

    tools = []
    for tool in method_data.get("tools", []):
        tool_id = tool["id"]
        enriched = dict(tool)

        # Attach purchase links
        links_data = PURCHASE_LINKS_DB.get(tool_id, {})
        enriched["purchase_links"] = links_data.get("purchase_links", {})

        tools.append(enriched)

    return tools


def _build_method_details(method_id: str) -> dict | None:
    """Build full method details including tools and purchase links."""
    methods = TOOLS_DB.get("methods", {})
    method_data = methods.get(method_id)
    if not method_data:
        return None

    return {
        "method_id": method_id,
        "display_name": method_data["display_name"],
        "description": method_data["description"],
        "when_to_use": method_data.get("when_to_use", ""),
        "tools": _get_tools_for_method(method_id)
    }


def match_tools(adjusted_result: dict) -> dict:
    """
    Main entry point for Stage 4.

    For each recommended fertilizer, looks up its application method(s)
    and attaches relevant tools with purchase links.

    Args:
        adjusted_result: Output from rainfall_adjuster.adjust_for_rainfall()

    Returns:
        Final enriched result with tools and purchase links for each recommendation.
    """
    if "error" in adjusted_result:
        return adjusted_result

    def _enrich_recommendations(recs: list[dict]) -> list[dict]:
        enriched = []
        for rec in recs:
            enriched_rec = dict(rec)
            methods = rec.get("methods", [])
            method_details = []

            for method_id in methods:
                detail = _build_method_details(method_id)
                if detail:
                    method_details.append(detail)

            enriched_rec["application_methods"] = method_details
            # Remove raw methods list since we now have enriched version
            enriched_rec.pop("methods", None)
            enriched.append(enriched_rec)

        return enriched

    result = dict(adjusted_result)

    recs = result.get("recommendations", {})
    result["recommendations"] = {
        "organic": _enrich_recommendations(recs.get("organic", [])),
        "chemical_supplements": _enrich_recommendations(recs.get("chemical_supplements", [])),
        "ph_amendments": _enrich_recommendations(recs.get("ph_amendments", []))
    }

    # Add quick-view summary for the UI
    all_tools_needed = set()
    for category in result["recommendations"].values():
        for rec in category:
            for method in rec.get("application_methods", []):
                for tool in method.get("tools", []):
                    all_tools_needed.add(tool["id"])

    result["tools_summary"] = {
        "total_unique_tools": len(all_tools_needed),
        "tool_ids": list(all_tools_needed)
    }

    return result
