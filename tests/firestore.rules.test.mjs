// Firestore のセキュリティルールのテスト（エミュレータで実行する）
// 実行：npm run test:rules
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    // demo- で始まるプロジェクト ID は、本物の Firebase につながらない
    projectId: "demo-renote",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("users/{uid}", () => {
  test("本人は自分の users/{uid} を作って読める", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice"), { settings: { themeId: "default" } }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice")));
  });

  test("本人は自分の日記を書いて読める", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/diaries/d1"), { rawText: "テスト" }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice/diaries/d1")));
  });

  test("他人の users/{uid} と日記は読めない・書けない", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/diaries/d1"), {
        rawText: "テスト",
      });
    });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(getDoc(doc(db, "users/alice/diaries/d1")));
    await assertFails(
      setDoc(doc(db, "users/alice/diaries/d2"), { rawText: "いたずら" }),
    );
  });

  test("ログインしていない人は何も読めない・書けない", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(setDoc(doc(db, "users/alice"), { settings: {} }));
  });

  test("users 以外の場所は、ログインしていても拒否される", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "public/x"), { a: 1 }));
    await assertFails(getDoc(doc(db, "public/x")));
  });
});
