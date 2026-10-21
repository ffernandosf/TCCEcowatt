from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.models.rollup import ReadingRollup


def build_report_pdf(
    device_id: str,
    period_start: datetime,
    period_end: datetime,
    rollups: list[ReadingRollup],
    tariff_rate_brl_per_kwh: float,
) -> bytes:
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    total_energy_wh = sum(r.energy_wh for r in rollups)
    total_cost_brl = sum(r.cost_brl for r in rollups)

    y = height - 2 * cm
    doc.setFont("Helvetica-Bold", 16)
    doc.drawString(2 * cm, y, "Relatório de consumo de energia")
    y -= 1 * cm

    doc.setFont("Helvetica", 10)
    doc.drawString(2 * cm, y, f"Dispositivo: {device_id}")
    y -= 0.5 * cm
    doc.drawString(
        2 * cm, y, f"Período: {period_start.strftime('%d/%m/%Y')} a {period_end.strftime('%d/%m/%Y')}"
    )
    y -= 0.5 * cm
    doc.drawString(2 * cm, y, f"Tarifa considerada: R$ {tariff_rate_brl_per_kwh:.4f}/kWh")
    y -= 1 * cm

    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(2 * cm, y, f"Consumo total: {total_energy_wh / 1000:.2f} kWh")
    y -= 0.6 * cm
    doc.drawString(2 * cm, y, f"Custo total estimado: R$ {total_cost_brl:.2f}")
    y -= 1.2 * cm

    doc.setFont("Helvetica-Bold", 10)
    doc.drawString(2 * cm, y, "Data")
    doc.drawString(6 * cm, y, "Energia (kWh)")
    doc.drawString(11 * cm, y, "Custo (R$)")
    y -= 0.4 * cm
    doc.line(2 * cm, y, width - 2 * cm, y)
    y -= 0.5 * cm

    doc.setFont("Helvetica", 9)
    for rollup in rollups:
        if y < 2 * cm:
            doc.showPage()
            y = height - 2 * cm
            doc.setFont("Helvetica", 9)
        doc.drawString(2 * cm, y, rollup.period_start.strftime("%d/%m/%Y"))
        doc.drawString(6 * cm, y, f"{rollup.energy_wh / 1000:.2f}")
        doc.drawString(11 * cm, y, f"{rollup.cost_brl:.2f}")
        y -= 0.5 * cm

    doc.showPage()
    doc.save()
    return buffer.getvalue()
