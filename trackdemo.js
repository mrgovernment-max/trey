// ========================================
// TREY order tracking functionality
// ========================================

function trackOrder() {
  const orderNumber = document.getElementById("order-number").value;
  const email = document.getElementById("tracking-email").value;
  const resultDiv = document.getElementById("tracking-result");

  // Show loading state
  resultDiv.style.display = "block";
  resultDiv.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="spinner" style="width: 40px; height: 40px; border: 2px solid #e2e2db; border-top-color: #c9a46c; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem;"></div>
            <p style="color: #6f6f69;">fetching tracking details...</p>
        </div>
    `;

  // Simulate API call (replace with actual fetch to your backend)
  setTimeout(() => {
    // Demo data — replace with real API response
    const trackingData = {
      orderNumber: orderNumber,
      status: "shipped",
      estimatedDelivery: "March 28, 2026",
      carrier: "DHL Express",
      trackingNumber: "DHL-9876543210",
      timeline: [
        {
          date: "2026-03-21",
          status: "order confirmed",
          description: "your order has been confirmed",
        },
        {
          date: "2026-03-22",
          status: "processing",
          description: "order is being prepared",
        },
        {
          date: "2026-03-23",
          status: "shipped",
          description: "order has been dispatched from Accra studio",
        },
        {
          date: "2026-03-25",
          status: "in transit",
          description: "package arrived at sorting facility",
        },
      ],
    };

    renderTrackingResult(trackingData);
  }, 800);
}

function renderTrackingResult(data) {
  const resultDiv = document.getElementById("tracking-result");

  let statusClass = "";
  if (data.status === "processing") statusClass = "processing";
  else if (data.status === "shipped") statusClass = "shipped";
  else if (data.status === "delivered") statusClass = "delivered";

  let statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);

  resultDiv.innerHTML = `
        <div class="result-header">
            <div class="result-order">
                <h4>order number</h4>
                <p>${data.orderNumber}</p>
            </div>
            <div class="result-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
        
        <div class="timeline">
            ${data.timeline
              .map(
                (step, index) => `
                <div class="timeline-step">
                    <div class="timeline-icon ${index <= 2 ? "completed" : ""}">
                        <i class="fa-regular ${
                          index === 0
                            ? "fa-circle-check"
                            : index === 1
                            ? "fa-box"
                            : index === 2
                            ? "fa-truck"
                            : "fa-location-dot"
                        }"></i>
                    </div>
                    <div class="timeline-content">
                        <h4>${
                          step.status.charAt(0).toUpperCase() +
                          step.status.slice(1)
                        }</h4>
                        <p>${step.date} · ${step.description}</p>
                    </div>
                </div>
            `
              )
              .join("")}
        </div>
        
        <div style="background: #f9f9f6; padding: 1.2rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <p style="font-size: 0.7rem; text-transform: uppercase; color: #8a8a84;">carrier</p>
                    <p style="font-size: 0.9rem; font-weight: 450;">${
                      data.carrier
                    }</p>
                </div>
                <div>
                    <p style="font-size: 0.7rem; text-transform: uppercase; color: #8a8a84;">tracking number</p>
                    <p style="font-size: 0.9rem; font-weight: 450;">${
                      data.trackingNumber
                    }</p>
                </div>
                <div>
                    <p style="font-size: 0.7rem; text-transform: uppercase; color: #8a8a84;">estimated delivery</p>
                    <p style="font-size: 0.9rem; font-weight: 450;">${
                      data.estimatedDelivery
                    }</p>
                </div>
            </div>
        </div>
    `;
}
