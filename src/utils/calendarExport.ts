import { CalendarAppointment } from '@/hooks/useCalendarData';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportAppointmentsToCSV(
  appointments: CalendarAppointment[],
  filename: string = 'appointments'
) {
  const headers = [
    'Date',
    'Start Time', 
    'End Time',
    'Patient Name',
    'Phone',
    'Provider',
    'Room',
    'Status',
    'Notes'
  ];

  const data = appointments.map(appointment => [
    format(new Date(appointment.starts_at), 'yyyy-MM-dd'),
    format(new Date(appointment.starts_at), 'HH:mm'),
    format(new Date(appointment.ends_at), 'HH:mm'),
    appointment.patients.arabic_full_name,
    appointment.patients.phone || '',
    appointment.providers?.display_name || '',
    appointment.rooms?.name || '',
    appointment.status,
    appointment.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...data.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportAppointmentsToPDF(
  appointments: CalendarAppointment[],
  filename: string = 'appointments',
  title: string = 'Appointments Report'
) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add generation date
  doc.setFontSize(11);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 32);

  // Prepare table data
  const tableHeaders = [
    'Date',
    'Time', 
    'Patient',
    'Phone',
    'Provider',
    'Room',
    'Status'
  ];

  const tableData = appointments.map(appointment => [
    format(new Date(appointment.starts_at), 'MM/dd'),
    `${format(new Date(appointment.starts_at), 'HH:mm')}-${format(new Date(appointment.ends_at), 'HH:mm')}`,
    appointment.patients.arabic_full_name,
    appointment.patients.phone || '',
    appointment.providers?.display_name || '',
    appointment.rooms?.name || '',
    appointment.status
  ]);

  // Add table
  doc.autoTable({
    head: [tableHeaders],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Date
      1: { cellWidth: 25 }, // Time
      2: { cellWidth: 40 }, // Patient
      3: { cellWidth: 30 }, // Phone
      4: { cellWidth: 30 }, // Provider
      5: { cellWidth: 20 }, // Room
      6: { cellWidth: 25 }, // Status
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
  });

  // Add notes section if any appointments have notes
  const appointmentsWithNotes = appointments.filter(app => app.notes);
  if (appointmentsWithNotes.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    
    doc.setFontSize(14);
    doc.text('Appointment Notes', 14, finalY + 20);
    
    let currentY = finalY + 30;
    doc.setFontSize(10);
    
    appointmentsWithNotes.forEach(appointment => {
      const timeStr = format(new Date(appointment.starts_at), 'MM/dd HH:mm');
      const text = `${timeStr} - ${appointment.patients.arabic_full_name}: ${appointment.notes}`;
      
      const splitText = doc.splitTextToSize(text, 180);
      doc.text(splitText, 14, currentY);
      currentY += splitText.length * 5 + 3;
      
      // Add new page if needed
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
    });
  }

  // Save the PDF
  doc.save(`${filename}.pdf`);
}

export function getExportFilename(viewType: string, date: Date): string {
  const dateStr = format(date, 'yyyy-MM-dd');
  return `appointments-${viewType}-${dateStr}`;
}