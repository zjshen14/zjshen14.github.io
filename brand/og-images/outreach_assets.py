"""Create feed covers and a source-backed MTP figure for blog outreach."""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "og"
FONT = Path(matplotlib.get_data_path()) / "fonts" / "ttf"
SOURCE = ROOT / "public" / "experiments" / "qwen-mtp-speed-quality" / "controlled-summary.json"
DATA = json.loads(SOURCE.read_text())
BACKGROUND = "#10131b"
INK = "#f2f5fa"
MUTED = "#b1bccd"
BLUE = "#5293e8"
GREY = "#8491a3"

def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)

def cover(path, kicker, title_lines, subtitle, chips):
    image = Image.new("RGB", (1000, 420), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 10, 420), fill=BLUE)
    draw.text((48, 32), kicker, font=font(19, True), fill=BLUE)
    for i, line in enumerate(title_lines):
        draw.text((48, 82 + i * 57), line, font=font(43, True), fill=INK)
    draw.text((48, 224), subtitle, font=font(21), fill=MUTED)
    left = 48
    for label in chips:
        width = draw.textbbox((0, 0), label, font=font(17))[2] + 28
        draw.rounded_rectangle((left, 299, left + width, 337), radius=8, fill="#1d2636")
        draw.text((left + 14, 308), label, font=font(17), fill=INK)
        left += width + 14
    draw.text((48, 374), "zjshen14.github.io", font=font(16), fill=MUTED)
    image.save(OUT / path)

def mtp_cover():
    image = Image.new("RGB", (1000, 420), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 10, 420), fill=BLUE)
    draw.text((48, 30), "DevLog / OpenCode Field Notes", font=font(19, True), fill=BLUE)
    draw.text((48, 70), "Faster tokens. More finished code?", font=font(37, True), fill=INK)
    draw.text((48, 123), "RTX 3090 + Qwen3.8-27B / Same GGUF / 16 attempts", font=font(20), fill=MUTED)
    for left, label, value in [(48, "Generation tokens / second", "36.0 → 56.2"), (525, "Completed + passing tasks", "2/8 → 2/8")]:
        draw.rounded_rectangle((left, 177, left + 424, 320), radius=12, fill="#1d2636")
        draw.text((left + 23, 195), label, font=font(18), fill=MUTED)
        draw.text((left + 23, 232), value, font=font(43, True), fill=INK)
        draw.text((left + 23, 288), "MTP off → on", font=font(16), fill=MUTED)
    draw.text((48, 347), "Small sample; patch-quality differences need more testing.", font=font(18), fill=MUTED)
    draw.text((48, 382), "zjshen14.github.io", font=font(16), fill=MUTED)
    image.save(OUT / "dev-qwen-mtp.png")

def result_figure():
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 16, "text.color": INK, "axes.labelcolor": MUTED, "xtick.color": INK, "ytick.color": MUTED})
    fig, axes = plt.subplots(1, 2, figsize=(12.8, 7.2), dpi=100, facecolor=BACKGROUND)
    fig.subplots_adjust(left=.085, right=.96, bottom=.24, top=.71, wspace=.32)
    fig.text(.065, .93, "MTP: 56% faster tokens. More finished code?", fontsize=25, weight="bold")
    fig.text(.065, .86, "RTX 3090 / Qwen3.8-27B Q4_K_M / Same GGUF / 16 controlled attempts", fontsize=15, color=MUTED)
    for ax in axes:
        ax.set_facecolor(BACKGROUND)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.spines["bottom"].set_color("#637085")
        ax.set_axisbelow(True)
        ax.grid(axis="y", color="#303947", linewidth=.7)
        ax.tick_params(axis="both", length=0, pad=12)
    speed = [DATA[mode]["generation_tokens_per_second"] for mode in ["off", "on"]]
    complete = [DATA[mode]["completed_tasks"] for mode in ["off", "on"]]
    axes[0].bar(["MTP off", "MTP on"], speed, width=.53, color=[GREY, BLUE])
    axes[0].set_ylim(0, 70)
    axes[0].set_yticks([0, 20, 40, 60])
    axes[0].set_title("Generation throughput", fontsize=18, pad=28, color=INK)
    axes[0].set_ylabel("Accepted output tokens / second", fontsize=13)
    for i, value in enumerate(speed):
        axes[0].text(i, value + 3, f"{value:.1f}", ha="center", fontsize=23, weight="bold")
    axes[1].bar(["MTP off", "MTP on"], complete, width=.53, color=[GREY, BLUE])
    axes[1].set_ylim(0, 8)
    axes[1].set_yticks([0, 2, 4, 6, 8])
    axes[1].set_title("Completed + passing tasks", fontsize=18, pad=28, color=INK)
    axes[1].set_ylabel("Attempts, out of 8 per mode", fontsize=13)
    for i, value in enumerate(complete):
        axes[1].text(i, value + .45, f"{value}/8", ha="center", fontsize=23, weight="bold")
    fig.text(.065, .13, "Two successful cache pairs finished 20–40% sooner with MTP.", fontsize=15, color=INK)
    fig.text(.065, .085, "Four small Python tasks, two seeds. Shared 8K output budget limited many runs.", fontsize=13, color=MUTED)
    fig.text(.065, .04, "Patch-quality difference needs more testing. Full settings + records: zjshen14.github.io", fontsize=12, color=MUTED)
    fig.savefig(OUT / "qwen-mtp-results.png", facecolor=BACKGROUND)
    fig.savefig(OUT / "qwen-mtp-results.svg", facecolor=BACKGROUND, metadata={"Date": None})
    plt.close(fig)

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    cover("dev-opencode-remote.png", "DevLog / OpenCode Field Notes", ["A coding agent.", "From your phone or laptop."], "Remote hosting, authentication and reverse proxy", ["OpenCode", "Browser access", "Self-hosted"])
    cover("dev-qwen-local.png", "DevLog / OpenCode Field Notes", ["One RTX 3090.", "A local coding agent."], "Qwen3.8-27B + llama.cpp + OpenCode: setup and results", ["24GB VRAM", "Q4_K_M", "Independent checks"])
    mtp_cover()
    result_figure()
