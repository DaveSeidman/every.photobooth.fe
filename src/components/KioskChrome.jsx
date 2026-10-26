export default function KioskChrome() {
  return (
    <div className="thesis-chrome" aria-hidden="true">
      <div className="thesis-chrome__squiggles" />
      <div className="thesis-chrome__brooklyn" />
      <img className="thesis-chrome__wordmark" src={`${import.meta.env.BASE_URL}thesis/img/thesis27.svg`} alt="" />
    </div>
  );
}
