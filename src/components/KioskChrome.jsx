import { appConfig } from "../config.js";
export default function KioskChrome() {
  return (
    <div className={`thesis-chrome ${appConfig.brand === "riiffs" ? "riiffs-chrome" : ""}`} aria-hidden="true">
      <div className="thesis-chrome__squiggles" />
      <div className="thesis-chrome__brooklyn" />
      <img className="thesis-chrome__wordmark" src={`${import.meta.env.BASE_URL}${appConfig.brand === "riiffs" ? "riiffs/riiffs-logo.png" : "thesis/img/thesis27.svg"}`} alt="" />
    </div>
  );
}
