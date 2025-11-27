import jsPDF from 'jspdf';

export const generateReceipt = (paymentDetails, studentDetails) => {
  const doc = new jsPDF(); 

  doc.setFontSize(20);
  doc.text("HOSTEL MESS RECEIPT", 105, 20, null, null, "center");
  
  doc.setFontSize(12);
  doc.text(`Receipt ID: ${paymentDetails.transactionId}`, 20, 40);
  doc.text(`Date: ${paymentDetails.date}`, 20, 50);
  
  doc.text("------------------------------------------------", 20, 60);
  
  doc.text(`Student Name: ${studentDetails.name}`, 20, 70);
  doc.text(`Department: ${studentDetails.dept}`, 20, 80);
  doc.text(`Payment Month: ${paymentDetails.month}`, 20, 90);
  
  doc.setFontSize(16);
  doc.text(`Amount Paid: Rs. ${paymentDetails.amount}`, 20, 110);
  
  doc.setFontSize(10);
  doc.text("This is a computer generated receipt.", 20, 140);
 
  doc.save(`Receipt_${paymentDetails.month}.pdf`);
};