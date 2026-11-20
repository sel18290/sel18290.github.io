/* CORTEX PFMP - liste imprimable des lieux de stage suivis.
   Utilise le moteur PDF local du site : aucun contact n'est envoyé au serveur. */
(function () {
  'use strict';

  const clean = value => String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const shorten = (value, max) => clean(value).slice(0, max);
  const niceDate = date => date.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  function build(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Aucun lieu enregistré à télécharger.');
    }
    const PDF = window.CORTEX_LOCAL_PDF;
    if (typeof PDF !== 'function') {
      throw new Error('Le moteur PDF n’est pas disponible. Recharge la page, puis réessaie.');
    }

    const places = entries
      .map(entry => entry && entry.place ? entry.place : entry)
      .filter(place => place && clean(place.name))
      .map(place => ({
        name: shorten(place.name, 200),
        address: shorten(place.address, 300) || 'Adresse non renseignée',
        phone: shorten(place.phone, 90)
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

    if (!places.length) throw new Error('Aucun lieu valide à télécharger.');

    const pdf = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const L = 17, R = 193, BOTTOM = 277;
    let y = 24, page = 1;
    const blue = [25, 69, 109], muted = [81, 103, 121], ink = [28, 52, 72];
    const pale = [244, 248, 251], line = [209, 224, 235];

    function header() {
      pdf.setFillColor(...blue).rect(0, 0, 210, 15, 'F');
      pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(255, 255, 255);
      pdf.text('CORTEX  /  PFMP', L, 10);
      pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted);
      pdf.text('Liste des structures enregistrées', L, 21);
    }

    function footer() {
      pdf.setDrawColor(...line).line(L, 283, R, 283);
      pdf.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(...muted);
      pdf.text('Coordonnées à vérifier avant toute prise de contact.', L, 288);
      pdf.text(String(page), R, 288, { align: 'right' });
    }

    function nextPage() {
      footer();
      pdf.addPage();
      page += 1;
      header();
      y = 30;
    }

    header();
    pdf.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...blue);
    pdf.text('Mes lieux de stage potentiels', L, 36);
    pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted);
    pdf.text(places.length + (places.length === 1 ? ' lieu enregistré' : ' lieux enregistrés') +
      '  |  ' + niceDate(new Date()), L, 44);
    pdf.setDrawColor(...line).line(L, 51, R, 51);
    y = 57;

    places.forEach((place, index) => {
      pdf.setFont('helvetica', 'bold').setFontSize(11);
      const titleLines = pdf.splitTextToSize(place.name, 154);
      pdf.setFont('helvetica', 'normal').setFontSize(9.5);
      const addressLines = pdf.splitTextToSize('Adresse : ' + place.address, 154);
      const phoneLines = place.phone ? pdf.splitTextToSize('Téléphone : ' + place.phone, 154) : [];
      const rowHeight = Math.max(23,
        7 + titleLines.length * 5.3 + addressLines.length * 5 +
        phoneLines.length * 4.6 + 5);
      if (y + rowHeight > BOTTOM) nextPage();

      pdf.setFillColor(...pale).rect(L, y, R - L, rowHeight, 'F');
      pdf.setFillColor(56, 119, 172).rect(L, y, 1.2, rowHeight, 'F');
      const x = 23;
      let ty = y + 7;
      pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...blue);
      for (const row of titleLines) { pdf.text(row, x, ty); ty += 5.3; }
      pdf.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...ink);
      for (const row of addressLines) { pdf.text(row, x, ty); ty += 5; }
      if (phoneLines.length) {
        pdf.setTextColor(...muted).setFontSize(9);
        for (const row of phoneLines) { pdf.text(row, x, ty); ty += 4.6; }
      }
      y += rowHeight + 3;
    });

    footer();
    return pdf;
  }

  function download(entries) {
    const pdf = build(entries);
    const date = new Date().toLocaleDateString('sv-SE');
    pdf.save('CORTEX-lieux-de-stage-' + date + '.pdf');
    return pdf;
  }

  window.CORTEX_PFMP_PDF = { build, download };
})();
