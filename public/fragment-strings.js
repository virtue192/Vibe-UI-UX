const languages=['zh-CN','en','ja','ko','de'];
export const labels={
 save:['保存草稿','Save draft','下書き保存','초안 저장','Entwurf speichern'],email:['邮箱','Email','メール','이메일','E-Mail'],invalid:['请输入有效邮箱。','Enter a valid email address.','有効なメールアドレスを入力。','유효한 이메일을 입력하세요.','Gültige E-Mail-Adresse eingeben.'],
 failToggle:['模拟本地失败','Simulate local failure','ローカル失敗を再現','로컬 실패 재현','Lokalen Fehler simulieren'],preferences:['保存偏好','Save preferences','設定を保存','설정 저장','Einstellungen speichern'],
 submitting:['正在提交','Submitting','送信中','제출 중','Wird gesendet'],statePreview:['本地状态预览','Local state preview','ローカル状態プレビュー','로컬 상태 미리보기','Lokale Zustandsvorschau'],
 success:['本地演示已完成，未保存服务器数据。','Local demonstration completed; no server data was saved.','ローカルデモ完了。サーバー保存なし。','로컬 데모 완료 · 서버 저장 없음.','Lokale Demo abgeschlossen; keine Serverdaten gespeichert.'],
 failure:['提交失败，输入已保留。','Submission failed; input is retained.','送信失敗。入力は保持。','제출 실패 · 입력 유지.','Senden fehlgeschlagen; Eingabe bleibt erhalten.'],
 completed:['请求已完成。','Request completed.','要求が完了しました。','요청 완료.','Anfrage abgeschlossen.'],
 retry:['重试本地演示','Retry local demo','ローカルデモを再試行','로컬 데모 재시도','Lokale Demo wiederholen'],filter:['筛选条目','Filter items','項目を絞り込む','항목 필터','Einträge filtern'],loading:['正在加载','Loading','読込中','불러오는 중','Wird geladen'],
 listError:['本地演示加载失败。','Could not load local demo.','ローカルデモ読込失敗。','로컬 데모 불러오기 실패.','Lokale Demo konnte nicht geladen werden.'],empty:['没有匹配条目。','No matching items.','一致する項目なし。','일치 항목 없음.','Keine passenden Einträge.'],results:['本地演示结果','Local demonstration results','ローカルデモ結果','로컬 데모 결과','Lokale Demoergebnisse'],
};
export const fragmentLabel=(key,locale='en')=>labels[key]?.[Math.max(0,languages.indexOf(locale))]||key;
