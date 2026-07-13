import json
import math

from django.conf import settings
from django.db import transaction

from apps.ai_tutor.openrouter import _post, OpenRouterError
from apps.courses.models import Course, Enrollment

from .models import SkillEdge, SkillNode, SkillTree


def _compute_layout(nodes: list[dict]) -> list[dict]:
    """Auto-layout nodes in a tree: root at top, children spread below."""
    depth_map: dict[int, list[dict]] = {}
    for n in nodes:
        d = n.get("depth", 0)
        depth_map.setdefault(d, []).append(n)

    max_depth = max(depth_map.keys()) if depth_map else 0
    for depth, items in depth_map.items():
        count = len(items)
        y = 10 + (depth / (max_depth or 1)) * 75
        for i, item in enumerate(items):
            x = 10 + ((i + 0.5) / count) * 80
            item["position_x"] = round(x, 1)
            item["position_y"] = round(y, 1)
    return nodes


def generate_skill_tree(user) -> SkillTree | None:
    enrollments = Enrollment.objects.filter(student=user, is_active=True).select_related("course")
    if not enrollments.exists():
        return None

    courses = [e.course for e in enrollments if e.course is not None]
    if not courses:
        return None

    course_summary = "\n".join(
        f"- {c.title} (catégorie: {c.category.name if c.category else 'Générale'}, niveau: {c.level})"
        for c in courses
    )

    prompt = (
        "Génère un arbre de compétences personnalisé pour un étudiant basé sur ses cours inscrits.\n\n"
        f"Cours de l'étudiant:\n{course_summary}\n\n"
        "Retourne UNIQUEMENT du JSON valide, sans markdown ni backticks:\n"
        "{\n"
        '  "title": "string (nom du domaine principal)",\n'
        '  "description": "string (description de l\'arbre)",\n'
        '  "nodes": [\n'
        "    {\n"
        '      "title": "string",\n'
        '      "description": "string",\n'
        '      "depth": 0,\n'
        '      "order": 0,\n'
        '      "icon": "string (emoji or icon name)"\n'
        "    }\n"
        "  ],\n"
        '  "edges": [\n'
        "    { \"parent_title\": \"string\", \"child_title\": \"string\" }\n"
        "  ]\n"
        "}\n\n"
        "Règles:\n"
        "- depth 0 = racine (le domaine), depth 1 = compétences principales, depth 2+ = sous-compétences\n"
        "- Chaque cours doit correspondre à au moins un nœud leaf (depth 2+)\n"
        "- 8-15 nœuds au total\n"
        "- Les edges définissent les relations parent→enfant (par titre)\n"
        "- Les nœuds de depth 0 sont débloqués au départ"
    )

    try:
        result = _post(
            messages=[{"role": "system", "content": "Tu génères des arbres de compétences en JSON."}, {"role": "user", "content": prompt}],
            model="cohere/north-mini-code:free",
            max_tokens=4096,
        )
    except OpenRouterError:
        return None

    raw = result.get("content", "")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    title = data.get("title", "Skill Tree")
    description = data.get("description", "")
    raw_nodes = data.get("nodes", [])
    raw_edges = data.get("edges", [])

    if not raw_nodes:
        return None

    raw_nodes = _compute_layout(raw_nodes)

    with transaction.atomic():
        tree = SkillTree.objects.create(user=user, title=title, description=description)

        node_map = {}
        for n in raw_nodes:
            node = SkillNode.objects.create(
                skill_tree=tree,
                title=n.get("title", ""),
                description=n.get("description", ""),
                position_x=n.get("position_x", 50),
                position_y=n.get("position_y", 10),
                depth=n.get("depth", 0),
                order=n.get("order", 0),
                icon=n.get("icon", ""),
                status=SkillNode.Status.UNLOCKED if n.get("depth", 0) == 0 else SkillNode.Status.LOCKED,
            )
            node_map[node.title] = node

        for e in raw_edges:
            parent = node_map.get(e.get("parent_title", ""))
            child = node_map.get(e.get("child_title", ""))
            if parent and child:
                SkillEdge.objects.create(skill_tree=tree, parent=parent, child=child)

    return tree
