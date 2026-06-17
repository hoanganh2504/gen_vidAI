import pytest

from app.services.prompt_builder import build_video_prompt


@pytest.mark.parametrize("style", ["advertising", "mukbang", "review", "cinematic", "asmr", "cooking"])
def test_prompt_builder_styles(style):
    result = build_video_prompt("crispy fried chicken", style, 5, "9:16")

    assert result.style == style
    if style == "cooking":
        assert "Recipe and cooking instructions" in result.optimized_prompt
    else:
        assert "Main food subject" in result.optimized_prompt
    assert "crispy fried chicken" in result.optimized_prompt
    assert "watermark" in result.negative_prompt


def test_cooking_prompt_allows_chef():
    result = build_video_prompt("Ga kho gung: uop ga, kho voi gung va nuoc mam", "cooking", 10, "16:9")
    assert "professional chef" in result.optimized_prompt
    assert "step by step" in result.optimized_prompt


@pytest.mark.parametrize(
    "content,style,duration,aspect_ratio",
    [
        ("", "advertising", 5, "9:16"),
        ("ab", "advertising", 5, "9:16"),
        ("valid content", "bad", 5, "9:16"),
        ("valid content", "advertising", 6, "9:16"),
        ("valid content", "advertising", 5, "4:3"),
    ],
)
def test_prompt_builder_rejects_invalid_input(content, style, duration, aspect_ratio):
    with pytest.raises(ValueError):
        build_video_prompt(content, style, duration, aspect_ratio)
