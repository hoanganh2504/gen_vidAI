FOOD_PROMPT_TEMPLATES = {
    "fried_chicken_ad": {
        "label": "Quang cao ga ran gion",
        "style": "advertising",
        "content": (
            "Quang cao ga ran gion: canh hero shot mieng ga vang ruom, lop vo no bong "
            "gion tan, hoi nong boc len, sot cham sanh min, am thanh/cam giac gion, "
            "anh sang studio cao cap, ket thuc bang cam giac them an manh."
        ),
        "marketing_angles": [
            "crispy golden crust",
            "juicy tender inside",
            "freshly fried steam",
            "premium fast-food commercial",
            "irresistible close-up texture",
        ],
    },
    "cheese_pizza_pull": {
        "label": "Pizza pho mai keo soi",
        "style": "advertising",
        "content": (
            "Pizza pho mai keo soi: canh cat slice pizza nong, pho mai mozzarella keo dai, "
            "mat banh bong sot ca chua, pepperoni va basil, anh sang am nha hang."
        ),
        "marketing_angles": ["cheese pull", "hot fresh pizza", "comfort food", "social media food ad"],
    },
    "milk_tea_cinematic": {
        "label": "Tra sua cinematic",
        "style": "cinematic",
        "content": (
            "Tra sua tran chau cinematic: dong sua chay vao tra, tran chau den bong dep, "
            "da lanh, ly nhua trong, canh quay cham cao cap cho reels."
        ),
        "marketing_angles": ["creamy swirl", "boba pearls", "refreshing drink", "premium cafe mood"],
    },
    "grilled_meat_asmr": {
        "label": "Food ASMR thit nuong",
        "style": "asmr",
        "content": (
            "Food ASMR thit nuong: thit nam tren vi nong, mo xeo xeo, nuoc sot bong, "
            "khoi nhe, canh macro nhan manh texture va chuyen dong thuc te."
        ),
        "marketing_angles": ["sizzling grill", "juicy glaze", "macro texture", "realistic food physics"],
    },
    "steak_mukbang": {
        "label": "Mukbang bit tet medium rare",
        "style": "mukbang",
        "content": (
            "Mukbang bit tet medium rare: mieng steak day, mat cat hong mong nuoc, "
            "khoai tay nghien va sot tieu den, setup ban an am cung, tap trung do ngon."
        ),
        "marketing_angles": ["medium rare steak", "juicy cut", "large appetizing portion", "warm indoor lighting"],
    },
    "recipe_chef_cooking": {
        "label": "Dau bep nau theo cong thuc",
        "style": "cooking",
        "content": (
            "Video huong dan nau an: mot dau bep chuyen nghiep trong bep hien dai nau mon theo cong thuc nguoi dung nhap. "
            "Canh quay bat dau voi nguyen lieu duoc sap xep gon gang, sau do cat thai, uop gia vi, nau tren chao/noi, "
            "kiem tra do chin, va bay mon hoan thien dep mat. Tap trung thao tac tay tu nhien, texture mon an, hoi nong, "
            "am thuc te va cam giac de lam theo."
        ),
        "marketing_angles": [
            "professional chef cooking",
            "step-by-step recipe tutorial",
            "realistic kitchen workflow",
            "ingredient prep and plating",
        ],
    },
}


def get_template(template_id: str | None) -> dict | None:
    if not template_id:
        return None
    return FOOD_PROMPT_TEMPLATES.get(template_id)


def list_templates() -> list[dict]:
    return [
        {
            "id": template_id,
            "label": value["label"],
            "style": value["style"],
            "content": value["content"],
        }
        for template_id, value in FOOD_PROMPT_TEMPLATES.items()
    ]
