export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '50px',
      color: 'white',
      fontFamily: 'Arial'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
          InvoiceFlow
        </h1>
        <p style={{ fontSize: '24px', marginBottom: '40px' }}>
          MSME Invoice Financing Platform
        </p>
        
        <div style={{ 
          background: 'white', 
          color: 'black', 
          padding: '30px', 
          borderRadius: '10px',
          marginBottom: '30px'
        }}>
          <h2 style={{ fontSize: '32px', color: '#667eea', marginBottom: '20px' }}>
            ?? Hackathon Demo Ready!
          </h2>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>
            Track 5: The Liquidity of Everything
          </p>
          <p>Transforming illiquid MSME invoices into instantly tradable assets</p>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>?55.5L</div>
            <div>Available Invoices</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>14.5%</div>
            <div>Average Returns</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>8.2/10</div>
            <div>Risk Score</div>
          </div>
        </div>
        
        <button style={{
          background: 'white',
          color: '#667eea',
          padding: '15px 30px',
          fontSize: '18px',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Connect Wallet to Start
        </button>
        
        <div style={{ marginTop: '40px', fontSize: '14px', opacity: '0.8' }}>
          <p>Smart Contracts Deployed ? Backend Running ? Frontend Live</p>
          <p>Kshitij 2026 Hackathon Submission</p>
        </div>
      </div>
    </div>
  )
}