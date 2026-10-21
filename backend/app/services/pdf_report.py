from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.models.rollup import ReadingRollup

LABELS = {
    "pt": {
        "title": "Relatório de consumo de energia",
        "device": "Dispositivo",
        "period": "Período",
        "period_sep": "a",
        "tariff": "Tarifa considerada",
        "total_energy": "Consumo total",
        "total_cost": "Custo total estimado",
        "date": "Data",
        "energy": "Energia (kWh)",
        "cost": "Custo (R$)",
        "date_format": "%d/%m/%Y",
    },
    "en": {
        "title": "Energy consumption report",
        "device": "Device",
        "period": "Period",
        "period_sep": "to",
        "tariff": "Tariff applied",
        "total_energy": "Total consumption",
        "total_cost": "Estimated total cost",
        "date": "Date",
        "energy": "Energy (kWh)",
        "cost": "Cost (R$)",
        "date_format": "%m/%d/%Y",
    },
}


def build_report_pdf(
    device_id: str,
    period_start: datetime,
    period_end: datetime,
    rollups: list[ReadingRollup],
    tariff_rate_brl_per_kwh: float,
    lang: str = "pt",
) -> bytes:
    t = LABELS.get(lang, LABELS["pt"])
    fmt = t["date_format"]
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    total_energy_wh = sum(r.energy_wh for r in rollups)
    total_cost_brl = sum(r.cost_brl for r in rollups)

    y = height - 2 * cm
    doc.setFont("Helvetica-Bold", 16)
    doc.drawString(2 * cm, y, t["title"])
    y -= 1 * cm

    doc.setFont("Helvetica", 10)
    doc.drawString(2 * cm, y, f"{t['device']}: {device_id}")
    y -= 0.5 * cm
    doc.drawString(
        2 * cm, y, f"{t['period']}: {period_start.strftime(fmt)} {t['period_sep']} {period_end.strftime(fmt)}"
    )
    y -= 0.5 * cm
    doc.drawString(2 * cm, y, f"{t['tariff']}: R$ {tariff_rate_brl_per_kwh:.4f}/kWh")
    y -= 1 * cm

    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(2 * cm, y, f"{t['total_energy']}: {total_energy_wh / 1000:.2f} kWh")
    y -= 0.6 * cm
    doc.drawString(2 * cm, y, f"{t['total_cost']}: R$ {total_cost_brl:.2f}")
    y -= 1.2 * cm

    doc.setFont("Helvetica-Bold", 10)
    doc.drawString(2 * cm, y, t["date"])
    doc.drawString(6 * cm, y, t["energy"])
    doc.drawString(11 * cm, y, t["cost"])
    y -= 0.4 * cm
    doc.line(2 * cm, y, width - 2 * cm, y)
    y -= 0.5 * cm

    doc.setFont("Helvetica", 9)
    for rollup in rollups:
        if y < 2 * cm:
            doc.showPage()
            y = height - 2 * cm
            doc.setFont("Helvetica", 9)
        doc.drawString(2 * cm, y, rollup.period_start.strftime(fmt))
        doc.drawString(6 * cm, y, f"{rollup.energy_wh / 1000:.2f}")
        doc.drawString(11 * cm, y, f"{rollup.cost_brl:.2f}")
        y -= 0.5 * cm

    doc.showPage()
    doc.save()
    return buffer.getvalue()
