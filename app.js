(async function () {
  const status = document.getElementById('status');
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const count = data.engines?.length ?? 0;
    status.textContent = `Data loaded: ${count} engine${count === 1 ? '' : 's'}`;
    console.log('data.json →', data);
  } catch (err) {
    status.textContent = 'ERROR: ' + err.message;
    console.error(err);
  }
})();