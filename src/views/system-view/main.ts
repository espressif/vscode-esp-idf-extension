import "./index.scss";

window.addEventListener("message", (evt: MessageEvent) => {
  const message = evt.data;
  console.log(message);
});
