from pathlib import Path
import shutil, subprocess, zipfile
from PIL import Image

base = Path(__file__).resolve().parents[1] / 'deliverables/week5'
out = base / 'W5_Submission_Images'
screens = out / '01_Existing_Softr_Evidence'
refs = out / '02_Digital_References_Not_Handwritten_Photos'
screens.mkdir(parents=True, exist_ok=True)
refs.mkdir(parents=True, exist_ok=True)
mapping = [
('Softr_Week5_Data.png','01_Tables_and_Five_Test_Records.png'),
('Softr_Week5_Authentication.png','02_Login_and_Email_Enabled.png'),
('Softr_Week5_Signup.png','03_Open_Signup_Settings.png'),
('Softr_Week5_Preview.png','04_Feature1_Request_List_Preview.png'),
('Softr_Week5_Handle_Request.png','05_Feature1_Edit_Request_Form.png'),
]
for src,dst in mapping:
    shutil.copy2(base/src,screens/dst)
    with Image.open(screens/dst) as im: im.verify()
poppler = Path(r'C:\Users\86299\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe')
subprocess.run([str(poppler),'-f','1','-l','2','-r','160','-png',str(base/'submission_pack/Week5_Delivery_Pack.pdf'),str(refs/'reference')],check=True)
for n,name in [(1,'06_Data_Model_Digital_Reference.png'),(2,'07_App_Map_Digital_Reference.png')]:
    shutil.move(str(refs/f'reference-{n}.png'),str(refs/name))
    with Image.open(refs/name) as im: im.verify()
readme='''W5 图片提交索引
整理日期：2026-10-20

01_Existing_Softr_Evidence 内是已有的真实 Softr 截图，保留原图，没有改界面或补造结果。
截图来自先前构建，不能作为今天复测或当前最终外观的证据。

01_Tables_and_Five_Test_Records.png
对应 W5 p23 数据表、p26 至少五条测试记录。
能看见四个表标签和五条诉求；不能完整证明所有表的字段或关联设置。

02_Login_and_Email_Enabled.png
对应 W5 p27：Login 开启、Email 开启。

03_Open_Signup_Settings.png
对应 W5 p27：Sign Up 选择 Open。与 02 一起上传可展示完整认证配置。

04_Feature1_Request_List_Preview.png
对应 W5 p31 Preview；展示诉求列表、筛选和操作入口。
这是 Test User 预览，不是第二个账号登录成功的证明。

05_Feature1_Edit_Request_Form.png
展示第一个功能的 Status、Owner decision 表单及 Save decision 按钮。
可作为操作界面补充图，但不能替代 p29 要求的编辑器 Edit record 动作配置截图。

02_Digital_References_Not_Handwritten_Photos 内是数字参考图：
06_Data_Model_Digital_Reference.png：校正后的表、字段和关联说明，含三个情境。
07_App_Map_Digital_Reference.png：页面、数据、按钮行为、访问身份和用户旅程。
这两张可以方便组员参照，不能标注成已完成的纸面任务照片。

尚需补拍/验证（不要把空缺当成已完成）：
- p15：组员参与绘制的数据模型正反面照片。
- p17：App Map 纸面照片。
- p22：Softr dashboard 显示项目的截图（截图本身不能证明从零创建过程）。
- p25：Linked Record 字段配置，显示目标表；并验证关联可打开正确记录。
- p28：Pages 页面及连接数据表的 block 设置。
- p29：Edit record / Add record 动作配置。
- p31-32：第二账号注册/登录成功、保存后的状态和重新打开的决定；实际试用记录。
- p32：更新后的 Kanban、含真实个人反思的 Weekly Log 按课程要求另交，不在此图片包里。

W6 新课件补充（p3、p7、p10）：
- 复查 Free plan，重测登录与 Feature 1。
- 导师走查：新增一条记录 -> 在列表找到 -> 打开详情。
- 现有编辑操作不能单独证明新增流程，Add record 仍需实测。
- Feature 2 开始且有一个可运行步骤即可；课件称这是进度建议，不是硬截止。
'''
(out/'提交图片索引_先看这里.txt').write_text(readme,encoding='utf-8-sig')
archive=base/'Homestay_AI_W5_Submission_Images.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(out.rglob('*')):
        if file.is_file(): z.write(file,file.relative_to(out))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist())==8
print('Prepared and verified: 5 original screenshots, 2 digital references, 1 submission index.')
