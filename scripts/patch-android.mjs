// Добавляет в AndroidManifest.xml ссылку com.tosto.app://auth-callback,
// чтобы после входа через Google браузер возвращал пользователя в приложение.
import fs from "node:fs";

const file = "android/app/src/main/AndroidManifest.xml";
if (!fs.existsSync(file)) {
  console.error(`Нет файла ${file}. Сначала выполните: npx cap add android`);
  process.exit(1);
}

let xml = fs.readFileSync(file, "utf8");

if (xml.includes('android:scheme="com.tosto.app"')) {
  console.log("Intent-filter уже добавлен, пропускаю.");
  process.exit(0);
}

const filter = `
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="com.tosto.app" android:host="auth-callback" />
        </intent-filter>
`;

if (!xml.includes("</activity>")) {
  console.error("В AndroidManifest.xml не найден тег </activity>.");
  process.exit(1);
}

xml = xml.replace("</activity>", `${filter}    </activity>`);

if (!/android:launchMode="singleTask"/.test(xml)) {
  xml = xml.replace(/<activity\b/, '<activity android:launchMode="singleTask"');
}

fs.writeFileSync(file, xml);
console.log("AndroidManifest.xml обновлён.");
