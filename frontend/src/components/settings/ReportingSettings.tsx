export function ReportingSettings() {
  return (
    <div id="report" className="mb-50 mt-20">
      <h2 className="text-xl font-medium text-palette-rich-teal mb-2">Reporting</h2>
      <p className="max-w-120 w-full leading-5 text-[#575454]">
        Did you notice a bug in development or the content? Shoot us an email at:
        <a className="text-dark-green" href="mailto:noreply.uwplanner@gmail.com">
          {' '}
          noreply.uwplanner@gmail.com
        </a>
      </p>
    </div>
  );
}
