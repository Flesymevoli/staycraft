from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "deliverables" / "week5" / "Homestay_AI_Week5_Paper_Task.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("SimHei", r"C:\Windows\Fonts\simhei.ttf"))
pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))

W, H = A4
INK = colors.HexColor("#152237")
MUTED = colors.HexColor("#627187")
BLUE = colors.HexColor("#3278FF")
PALE = colors.HexColor("#EEF4FF")
LINE = colors.HexColor("#D8E0EA")
GREEN = colors.HexColor("#E9F5EF")


def txt(c, x, y, value, size=10, color=INK, font="SimHei"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, value)


def right(c, x, y, value, size=9, color=MUTED, font="Arial"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x, y, value)


def line(c, x1, y1, x2, y2, color=LINE, width=1):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def arrow(c, x1, y1, x2, y2):
    from math import atan2, cos, pi, sin

    line(c, x1, y1, x2, y2, BLUE, 1.6)
    a = atan2(y2 - y1, x2 - x1)
    side = 5 * pi / 6
    for d in (-side, side):
        line(c, x2, y2, x2 + 8 * cos(a + d), y2 + 8 * sin(a + d), BLUE, 1.6)


def card(c, x, y, title, cn, fields):
    width, height = 245, 210
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, width, height, 14, fill=1, stroke=1)
    c.setFillColor(PALE)
    c.roundRect(x + 10, y + height - 41, width - 20, 31, 8, fill=1, stroke=0)
    txt(c, x + 21, y + height - 31, title, 12, INK, "Arial-Bold")
    right(c, x + width - 19, y + height - 29, cn, 9, MUTED, "SimHei")
    for i, (name, zh, typ, linked) in enumerate(fields):
        ry = y + height - 69 - i * 25
        if linked:
            c.setFillColor(BLUE)
            c.circle(x + 20, ry + 3, 2.4, fill=1, stroke=0)
        txt(c, x + 28, ry, name, 8.9, BLUE if linked else INK, "Arial")
        txt(c, x + 113, ry, zh, 8.2, MUTED)
        right(c, x + width - 17, ry, typ, 8.2, BLUE if linked else MUTED)
        if i < len(fields) - 1:
            line(c, x + 19, ry - 8, x + width - 19, ry - 8, LINE, 0.45)
    line(c, x + 18, y + 34, x + width - 18, y + 34)
    txt(c, x + 20, y + 15, "参与组员：________ / ________", 8.5, MUTED)


def header(c, title, subtitle, page):
    c.setFillColor(BLUE)
    c.roundRect(34, H - 48, 6, 18, 3, fill=1, stroke=0)
    txt(c, 50, H - 45, title, 18, INK)
    txt(c, 35, H - 67, subtitle, 9, MUTED)
    line(c, 35, H - 82, W - 35, H - 82)
    right(c, W - 35, 25, f"WEEK 5  ·  {page} / 2", 8, MUTED)


c = canvas.Canvas(str(OUTPUT), pagesize=A4)
c.setTitle("Homestay AI | Week 5 Paper Task")
c.setAuthor("Homestay AI Assistant team")

# Front: four-table model.
header(c, "Paper task｜先在纸上画数据", "对应第 5 周课件 p.15：3–5 张表、字段与类型、Linked record 关联。", 1)
c.setFillColor(PALE)
c.roundRect(35, 704, W - 70, 43, 10, fill=1, stroke=0)
txt(c, 49, 729, "本组示例：客人咨询 → AI 建议草稿 → 经营者确认。蓝色字段表示 Linked record。", 9.3)
txt(c, 49, 712, "四张表对应 Softr 演示应用；此图是纸面模型，建表时逐项核对实际列名。", 8.7, MUTED)

card(c, 35, 476, "Properties", "民宿", [
    ("Property name", "民宿名", "Text", False),
    ("Location", "位置", "Text", False),
    ("Check-in time", "入住时间", "Time", False),
    ("Breakfast hours", "早餐时段", "Text", False),
    ("Cancel policy", "取消规则", "Long text", False),
])
card(c, 315, 476, "Guests", "客人", [
    ("Guest name", "客人姓名", "Text", False),
    ("Contact channel", "联系渠道", "Select", False),
    ("Contact ID", "联系标识", "Text", False),
    ("Language", "偏好语言", "Select", False),
    ("Notes", "备注", "Long text", False),
])
card(c, 35, 218, "Bookings", "预订", [
    ("Booking ref", "订单编号", "Text", False),
    ("Property", "所属民宿", "Linked", True),
    ("Guest", "对应客人", "Linked", True),
    ("Check-in date", "入住日期", "Date", False),
    ("Status", "预订状态", "Select", False),
])
card(c, 315, 218, "Guest Requests", "客人诉求", [
    ("Request", "问题内容", "Long text", False),
    ("Booking", "对应订单", "Linked", True),
    ("AI draft", "建议回复", "Long text", False),
    ("Status", "处理状态", "Select", False),
    ("Owner decision", "经营者决定", "Long text", False),
])

arrow(c, 157, 474, 157, 441)
txt(c, 164, 453, "1 → 多", 7.6, BLUE)
arrow(c, 322, 473, 272, 439)
txt(c, 282, 455, "1 → 多", 7.6, BLUE)
arrow(c, 282, 323, 311, 323)
txt(c, 283, 332, "1 → 多", 7.6, BLUE)

c.setFillColor(colors.HexColor("#F8FAFD"))
c.roundRect(35, 93, W - 70, 90, 10, fill=1, stroke=0)
txt(c, 50, 160, "给组员讲解时按这条路径走：", 10, INK)
txt(c, 50, 139, "1  客人与民宿各自存基础资料；一个客人可以有多个预订。", 9, MUTED)
txt(c, 50, 120, "2  每条诉求链接一笔预订；通过预订可找到客人与适用的民宿规则。", 9, MUTED)
txt(c, 50, 101, "3  AI draft 是演示建议；Status / Owner decision 记录人工处理，不代表已发送或退款。", 8.5, MUTED)
txt(c, 35, 57, "姓名：________________    小组：________________    日期：________________", 9, MUTED)
c.showPage()

# Back: three walk-through situations, following the slide's paper test.
header(c, "背面｜用 3 个情境测试这张图", "每个情境都回答：新建哪条记录？改哪个字段？通过哪条关联找到所需资料？", 2)


def scenario(c, y, number, title, action, steps, check):
    x, width, height = 35, W - 70, 178
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, width, height, 13, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.circle(x + 22, y + height - 28, 13, fill=1, stroke=0)
    txt(c, x + 18.5, y + height - 32, str(number), 10, colors.white, "Arial-Bold")
    txt(c, x + 43, y + height - 33, title, 11.5)
    txt(c, x + 20, y + height - 62, "用户动作", 8, BLUE)
    txt(c, x + 83, y + height - 62, action, 9, INK)
    line(c, x + 20, y + height - 73, x + width - 20, y + height - 73)
    for i, s in enumerate(steps):
        txt(c, x + 20, y + height - 95 - i * 20, s, 8.7, MUTED)
    c.setFillColor(GREEN)
    c.roundRect(x + 17, y + 12, width - 34, 25, 7, fill=1, stroke=0)
    txt(c, x + 26, y + 21, check, 8.3, INK)


scenario(c, 550, 1, "早餐咨询：找到正确回复", "Jamie 询问早餐几点开始。", [
    "① 在 Guest Requests 新建咨询，Booking 链接 GH-201。",
    "② 由 Booking 找到 Property，读取 Breakfast hours。",
    "③ AI draft 写出示例建议；经营者核对后再更新 Status。",
], "核对：建议内容有民宿资料依据；演示文案不等于真实发送。")

scenario(c, 348, 2, "提前入住：保留人工决定", "Alex 希望 12:00 入住，常规时间为 14:00。", [
    "① 找到 GH-102 对应的 Booking，新增或打开相关 Request。",
    "② AI draft 提醒先确认房间准备情况，不直接承诺。",
    "③ 在 Owner decision 记录决定，再把 Status 从 Todo 改为处理中。",
], "核对：旧记录仍在；状态变化和经营者决定能解释清楚。")

scenario(c, 146, 3, "取消退款：区分建议与执行", "Taylor 询问 GH-204 能否退款。", [
    "① Request → Booking → Property，找到订单与取消规则。",
    "② AI draft 提示核实条件；Owner decision 记录拟处理方案。",
    "③ 更新 Request 状态，但不能把它写成退款已完成。",
], "核对：能说出哪张表存订单、哪张表存处理记录。")

txt(c, 35, 112, "小组互教：每人参与至少一张表（可共写），讲清一条关联和一个可能出错的地方。", 8.6, INK)
line(c, 35, 97, W - 35, 97)
txt(c, 35, 78, "检查记录：重复录入了什么？哪条关系缺失？需要改动的字段：____________________________", 8.2, MUTED)
txt(c, 35, 57, "组员姓名：________________    复核组员：________________    修订日期：________________", 8.5, MUTED)
c.save()
print("Paper task PDF created")
