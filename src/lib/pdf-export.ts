import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  BudgetItem,
  ChecklistItem,
  CourtMember,
  GodparentItem,
  HiredVendorItem,
  QuoteRequest,
  SongItem,
  TableItem,
  TimelineItem,
} from '@/lib/types';

export type EventPdfDossierInput = {
  quinceaneraName: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  eventLocation?: string;
  theme?: string;
  colorPalette?: string;
  musicPreferences?: string[];
  dancePreferences?: string[];
  hiredVendors: HiredVendorItem[];
  quotes: QuoteRequest[];
  tables: TableItem[];
  godparents: GodparentItem[];
  courtOfHonor: CourtMember[];
  timeline: TimelineItem[];
  playlist: SongItem[];
  checklist: ChecklistItem[];
  budgetItems?: BudgetItem[];
};

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

// Strip emojis and unsupported surrogate pairs so Helvetica PDF text renders cleanly
function cleanPdfText(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatEventDateEs(rawDate?: string): string {
  if (!rawDate?.trim()) return 'Por confirmar';
  const parsed = new Date(`${rawDate}T12:00:00`);
  if (isNaN(parsed.getTime())) return cleanPdfText(rawDate);
  return parsed.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const COURT_ROLE_LABELS: Record<CourtMember['role'], string> = {
  chambelan_honor: 'Chambelan de Honor',
  chambelan: 'Chambelan',
  dama: 'Dama de Honor',
};

const COURT_STATUS_LABELS: Record<CourtMember['status'], string> = {
  confirmado: 'Confirmado',
  ensayando: 'Ensayando',
  pendiente: 'Pendiente',
};

export function generateSalonEventPdf(data: EventPdfDossierInput): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  }) as JsPdfWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Brand Palette (Mundo 15 Royal Burgundy & Champagne Gold)
  const BURGUNDY: [number, number, number] = [138, 22, 68];
  const DARK_INK: [number, number, number] = [34, 24, 28];
  const MUTED_INK: [number, number, number] = [105, 92, 97];
  const SOFT_ROSE_BG: [number, number, number] = [252, 245, 248];
  const BORDER_LINE: [number, number, number] = [230, 212, 220];

  const totalGuests = data.tables.reduce((sum, t) => sum + t.guests.length, 0);
  const completedTasks = data.checklist.filter((c) => c.completed).length;

  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  const drawSectionHeading = (num: string, title: string, subtitle?: string) => {
    ensureSpace(22);
    doc.setFillColor(...BURGUNDY);
    doc.roundedRect(marginX, y, 7, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(num, marginX + 3.5, y + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BURGUNDY);
    doc.text(cleanPdfText(title), marginX + 10, y + 5.2);

    y += 9;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED_INK);
      doc.text(cleanPdfText(subtitle), marginX, y);
      y += 4.5;
    }
    doc.setDrawColor(...BORDER_LINE);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 4;
  };

  const getFinalY = () => (doc.lastAutoTable?.finalY ?? y) + 7;

  // =========================================================================
  // HEADER BANNER
  // =========================================================================
  doc.setFillColor(...BURGUNDY);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(248, 215, 226);
  doc.text('MUNDO 15  |  EXPEDIENTE OPERATIVO PARA EL SALON DE EVENTOS', marginX, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanPdfText(`XV Anos de ${data.quinceaneraName || 'Quinceanera'}`), marginX, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 240, 245);
  const generatedLabel = `Documento generado el ${new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`;
  doc.text(generatedLabel, marginX, 28.5);

  y = 41;

  // =========================================================================
  // EVENT OVERVIEW CARD
  // =========================================================================
  doc.setFillColor(...SOFT_ROSE_BG);
  doc.setDrawColor(...BORDER_LINE);
  doc.roundedRect(marginX, y, contentWidth, 36, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_INK);
  doc.text('FECHA DEL EVENTO', marginX + 4, y + 6);
  doc.text('SALON / CIUDAD / LUGAR', marginX + contentWidth / 2 + 2, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_INK);
  doc.text(cleanPdfText(formatEventDateEs(data.eventDate)), marginX + 4, y + 11.5, {
    maxWidth: contentWidth / 2 - 6,
  });
  doc.text(
    cleanPdfText(data.eventLocation || 'No especificado en el perfil'),
    marginX + contentWidth / 2 + 2,
    y + 11.5,
    { maxWidth: contentWidth / 2 - 6 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_INK);
  doc.text('CONTACTO PRINCIPAL', marginX + 4, y + 20.5);
  doc.text('TEMATICA Y PALETA DE COLORES', marginX + contentWidth / 2 + 2, y + 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK_INK);
  const contactText = [
    data.phone ? `Tel: ${data.phone}` : null,
    data.email ? data.email : null,
  ]
    .filter(Boolean)
    .join('  |  ') || 'No registrado';
  doc.text(cleanPdfText(contactText), marginX + 4, y + 26, {
    maxWidth: contentWidth / 2 - 6,
  });

  const styleText = [
    data.theme || 'Tematica por definir',
    data.colorPalette ? `Colores: ${data.colorPalette}` : null,
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(cleanPdfText(styleText), marginX + contentWidth / 2 + 2, y + 26, {
    maxWidth: contentWidth / 2 - 6,
  });

  y += 42;

  // =========================================================================
  // KPI STRIP
  // =========================================================================
  const kpis = [
    { label: 'MESAS', value: String(data.tables.length) },
    { label: 'INVITADOS', value: String(totalGuests) },
    { label: 'PADRINOS', value: String(data.godparents.length) },
    { label: 'CORTE DE HONOR', value: String(data.courtOfHonor.length) },
    { label: 'PROVEEDORES', value: String(data.hiredVendors.length) },
  ];
  const boxGap = 2.5;
  const boxW = (contentWidth - boxGap * (kpis.length - 1)) / kpis.length;

  kpis.forEach((kpi, idx) => {
    const bx = marginX + idx * (boxW + boxGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER_LINE);
    doc.roundedRect(bx, y, boxW, 15, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BURGUNDY);
    doc.text(kpi.value, bx + boxW / 2, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED_INK);
    doc.text(kpi.label, bx + boxW / 2, y + 12.8, { align: 'center' });
  });

  y += 22;

  // =========================================================================
  // SECTION 1: PROVEEDORES CONTRATADOS (ACADEMIA, CONJUNTO MUSICAL, DJ, ETC.)
  // =========================================================================
  drawSectionHeading(
    '1',
    'Proveedores y Servicios Contratados para el Evento',
    'Academia de baile contratada, conjunto musical / banda / DJ, fotografia, banquete y equipo operativo.'
  );

  if (data.hiredVendors.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Categoria / Servicio', 'Empresa / Academia / Grupo', 'Contacto y Telefono', 'Llegada / Notas para Salon']],
      body: data.hiredVendors.map((v) => [
        cleanPdfText(v.category),
        cleanPdfText(v.name),
        cleanPdfText([v.contactName, v.phone].filter(Boolean).join(' - ') || 'Sin telefono'),
        cleanPdfText(
          [v.arrivalTime ? `Llegada: ${v.arrivalTime}` : null, v.notes].filter(Boolean).join(' | ') ||
            'Sin observaciones'
        ),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_INK);
    doc.text(
      'No hay proveedores registrados en "Proveedores Contratados" todavia.',
      marginX,
      y + 2
    );
    y += 9;
  }

  // Also include sent quotes if user contacted academies and hasn't transferred them yet
  if (data.quotes.length > 0) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_INK);
    doc.text('Academias / Negocios Cotizados desde Mundo 15:', marginX, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Academia / Empresa', 'Estado', 'Fecha Solicitada', 'Mensaje / Detalle']],
      body: data.quotes.map((q) => [
        cleanPdfText(q.academyName),
        q.status === 'contacted' ? 'Contactado' : q.status === 'archived' ? 'Archivado' : 'Pendiente',
        cleanPdfText(q.eventDate || 'No especificada'),
        cleanPdfText(q.message),
      ]),
      styles: { fontSize: 8, cellPadding: 2.2, textColor: DARK_INK },
      headStyles: { fillColor: [90, 62, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 247, 248] },
    });
    y = getFinalY();
  }

  // =========================================================================
  // SECTION 2: MESAS E INVITADOS (RECEPCION DE SALON)
  // =========================================================================
  drawSectionHeading(
    '2',
    'Distribucion de Mesas y Lista Completa de Invitados',
    `Total: ${data.tables.length} mesas configuradas y ${totalGuests} invitados asignados para control de recepcion.`
  );

  if (data.tables.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Mesa', 'Cant.', 'Lista de Invitados Asignados']],
      body: data.tables.map((t) => [
        cleanPdfText(t.tableName),
        String(t.guests.length),
        t.guests.length > 0
          ? t.guests.map((g, idx) => `${idx + 1}. ${cleanPdfText(g)}`).join('   |   ')
          : 'Sin invitados asignados',
      ]),
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 16, halign: 'center' },
        2: { cellWidth: 'auto' },
      },
      styles: { fontSize: 8.5, cellPadding: 2.8, textColor: DARK_INK, valign: 'top' },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_INK);
    doc.text('Aun no hay mesas ni invitados registrados.', marginX, y + 2);
    y += 9;
  }

  // =========================================================================
  // SECTION 3: PADRINOS Y MADRINAS
  // =========================================================================
  drawSectionHeading(
    '3',
    'Lista Oficial de Padrinos y Madrinas',
    'Personas clave para mencion, lugares reservados, entrega de simbolos y brindis.'
  );

  if (data.godparents.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['#', 'Nombre Completo', 'Padrinazgo / Responsabilidad', 'Telefono']],
      body: data.godparents.map((g, idx) => [
        String(idx + 1),
        cleanPdfText(g.name),
        cleanPdfText(g.role),
        cleanPdfText(g.phone || 'No registrado'),
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
      },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_INK);
    doc.text('Aun no hay padrinos o madrinas registrados.', marginX, y + 2);
    y += 9;
  }

  // =========================================================================
  // SECTION 4: CORTE DE HONOR
  // =========================================================================
  drawSectionHeading(
    '4',
    'Corte de Honor (Chambelanes y Damas)',
    'Integrantes participantes en entrada triunfal, vals principal y baile sorpresa.'
  );

  if (data.courtOfHonor.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['#', 'Nombre', 'Rol', 'Telefono', 'Vestuario / Notas', 'Estatus']],
      body: data.courtOfHonor.map((m, idx) => [
        String(idx + 1),
        cleanPdfText(m.name),
        COURT_ROLE_LABELS[m.role] || cleanPdfText(m.role),
        cleanPdfText(m.phone || '-'),
        cleanPdfText(m.outfitDetails || '-'),
        COURT_STATUS_LABELS[m.status] || cleanPdfText(m.status),
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
      },
      styles: { fontSize: 8.2, cellPadding: 2.4, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_INK);
    doc.text('Aun no hay miembros de la corte de honor registrados.', marginX, y + 2);
    y += 9;
  }

  // =========================================================================
  // SECTION 5: ITINERARIO MINUTO A MINUTO
  // =========================================================================
  drawSectionHeading(
    '5',
    'Itinerario Minuto a Minuto para Coordinacion del Salon',
    'Horarios programados para protocolo, cena, vals, brindis y espectaculos.'
  );

  if (data.timeline.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Hora', 'Momento / Actividad', 'Detalles Operativos']],
      body: data.timeline.map((item) => [
        cleanPdfText(item.time),
        cleanPdfText(item.title),
        cleanPdfText(item.description || '-'),
      ]),
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 68, fontStyle: 'bold' },
      },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  }

  // =========================================================================
  // SECTION 6: MUSICA ESPECIAL Y NOTAS PARA DJ / CONJUNTO
  // =========================================================================
  drawSectionHeading(
    '6',
    'Playlist Especial y Guia Musical (Para DJ / Conjunto / Sonido)',
    'Canciones confirmadas para cada momento clave del protocolo.'
  );

  if (data.playlist.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Momento Clave', 'Cancion', 'Artista / Grupo', 'Indicaciones para DJ / Sonido']],
      body: data.playlist.map((song) => [
        cleanPdfText(song.moment),
        cleanPdfText(song.title),
        cleanPdfText(song.artist || '-'),
        cleanPdfText(song.notes || '-'),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  }

  // =========================================================================
  // SECTION 7: CHECKLIST DE LOGISTICA & PREFERENCIAS
  // =========================================================================
  drawSectionHeading(
    '7',
    'Control de Preparativos (Check-list) y Preferencias',
    `Avance actual: ${completedTasks} de ${data.checklist.length} tareas completadas.`
  );

  if (data.checklist.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Estado', 'Categoria', 'Pendiente / Actividad']],
      body: data.checklist.map((item) => [
        item.completed ? 'LISTO' : 'PENDIENTE',
        cleanPdfText(item.category),
        cleanPdfText(item.title),
      ]),
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 36 },
      },
      styles: { fontSize: 8, cellPadding: 2.2, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  }

  if (data.budgetItems && data.budgetItems.length > 0) {
    const estTotal = data.budgetItems.reduce((a, b) => a + (b.estimatedAmount || 0), 0);
    const paidTotal = data.budgetItems.reduce((a, b) => a + (b.actualAmount || 0), 0);
    drawSectionHeading(
      '8',
      'Resumen de Pagos y Anticipos a Proveedores',
      `Estimado total: $${estTotal.toLocaleString('es-MX')}  |  Pagado / Anticipos: $${paidTotal.toLocaleString('es-MX')}  |  Saldo pendiente: $${Math.max(0, estTotal - paidTotal).toLocaleString('es-MX')}`
    );

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Concepto', 'Categoria', 'Estimado', 'Pagado', 'Saldo']],
      body: data.budgetItems.map((b) => [
        cleanPdfText(b.concept),
        cleanPdfText(b.category),
        `$${(b.estimatedAmount || 0).toLocaleString('es-MX')}`,
        `$${(b.actualAmount || 0).toLocaleString('es-MX')}`,
        `$${Math.max(0, (b.estimatedAmount || 0) - (b.actualAmount || 0)).toLocaleString('es-MX')}`,
      ]),
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      styles: { fontSize: 8, cellPadding: 2.2, textColor: DARK_INK },
      headStyles: { fillColor: BURGUNDY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SOFT_ROSE_BG },
    });
    y = getFinalY();
  }

  // =========================================================================
  // ADD PAGE NUMBERS TO EVERY PAGE
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_INK);
    doc.text(
      cleanPdfText(`Mundo 15  ·  Expediente para Salon: ${data.quinceaneraName || 'XV Anos'}`),
      marginX,
      pageHeight - 8
    );
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const safeSlug = cleanPdfText(data.quinceaneraName || 'Quinceanera')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'quinceanera';

  const fileName = `Expediente_Salon_XV_${safeSlug}.pdf`;
  doc.save(fileName);
  return fileName;
}
