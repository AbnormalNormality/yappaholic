import { doc, type DocumentChange, type DocumentData } from "firebase/firestore";
import * as b from "./backend.js";

const loginButton = document.querySelector<HTMLDivElement>("#login")!;
const logoutButton = document.querySelector<HTMLDivElement>("#logout")!;
const deleteAccountButton = document.querySelector<HTMLDivElement>("#delete-account")!;
const usernameText = document.querySelector<HTMLDivElement>("#username")!;
const postInputField = document.querySelector<HTMLTextAreaElement>("#message-input")!;
const sendPostButton = document.querySelector<HTMLDivElement>("#send-message")!;

b.handleAuth(async (user) => {
  if (user) {
    document.documentElement.setAttribute("logged-in", "");
    const userData = await b.getUserById(user.uid);
    usernameText.innerText = userData?.displayname || "Unknown User";
  } else {
    document.documentElement.removeAttribute("logged-in");
  }
});
loginButton.addEventListener("click", b.loginWithGoogle);
logoutButton.addEventListener("click", b.logout);
deleteAccountButton.addEventListener("click", async () => {
  const doDelete = confirm(
    "Are you sure you want to delete your account and posts?\nThis action is irreversible."
  );
  if (doDelete) await b.deleteAccount();
});

const postsMap = new Map<string, HTMLDivElement>();
const postsContainer = document.querySelector<HTMLDivElement>("#posts")!;

async function handlePost(change: DocumentChange<DocumentData, DocumentData>) {
  const id = change.doc.id;
  const docData = change.doc.data() as b.PostData;

  if (change.type === "removed" && postsMap.has(id)) {
    const postDiv = postsMap.get(id)!;
    postDiv.remove();
    postsMap.delete(id);
  }
  if (change.type === "added" || change.type === "modified") {
    const post = document.createElement("div");
    post.classList.add("post");
    if (b.getCurrentUser()?.uid === docData.author) {
      post.classList.add("own");
    }

    const header = document.createElement("div");
    header.classList.add("header");

    const authorData = await b.getUserById(docData.author);
    const author = document.createElement("div");
    author.classList.add("author");
    author.innerText = authorData?.displayname || docData.author;

    const timestamp = document.createElement("div");
    timestamp.classList.add("timestamp");
    timestamp.innerText = docData.timestamp.toDate().toLocaleString();

    if (await b.canDeletePost(change.doc)) {
      const deleteButton = document.createElement("div");
      deleteButton.classList.add("delete", "button", "important");
      deleteButton.innerText = "🗑";
      deleteButton.addEventListener("click", async () => {
        const doDelete = confirm(
          "Are you sure you want to delete this post?\nThis action is irreversible."
        );
        if (doDelete) await b.deletePost(id);
      });
      header.appendChild(deleteButton);
    }

    const text = document.createElement("div");
    text.classList.add("text");
    text.innerText = docData.text.replaceAll("\\n", "\n");

    header.append(author, timestamp);
    post.append(header, text);

    if (change.type === "modified" && postsMap.has(id)) {
      postsMap.get(id)!.replaceWith(post);
    } else {
      postsContainer.prepend(post);
      postsMap.set(id, post);
    }
  }
}

b.handlePost(async (change: DocumentChange<DocumentData, DocumentData>) => {
  try {
    await handlePost(change);
  } catch (e) {
    console.warn(
      `Alia says:\n Couldn't load post '${change.doc.id}'!\n idk, it's probably corrupt or smt.\n Hopefully the message below helps lol`
    );
    console.error(e);
  }
});

function sendPost() {
  const textContent = postInputField.value.trim();
  const trimOutput = textContent.replace(/\n\n+/g, "\n").slice(0, 400);

  if (textContent !== trimOutput) {
    postInputField.value = trimOutput;
    return;
  }

  if (textContent.length > 0) {
    b.createPost(textContent);
    postInputField.value = "";
  }
}

postInputField.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    sendPost();
  }
});
sendPostButton.addEventListener("click", sendPost);
