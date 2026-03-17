const { getDb } = require('../db');

const insightsRepository = {
  createSession(session) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO insight_sessions (id, requested_by, prompt, generated_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    return stmt.run(session.id, session.requested_by, session.prompt, session.generated_at);
  },

  createChart(chart) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO insight_charts (id, session_id, type, title, explanation, x_axis_label, y_axis_label, chart_data, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    return stmt.run(
      chart.id,
      chart.session_id,
      chart.type,
      chart.title,
      chart.explanation || '',
      chart.x_axis_label || '',
      chart.y_axis_label || '',
      JSON.stringify(chart.data),
      chart.sort_order || 0
    );
  },

  findSessionById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM insight_sessions WHERE id = ?').get(id);
  },

  getAllSessions() {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT * FROM insight_sessions ORDER BY created_at DESC
    `).all();

    return sessions.map(session => {
      const charts = db.prepare(`
        SELECT id, type, title, explanation, x_axis_label, y_axis_label, chart_data, sort_order
        FROM insight_charts WHERE session_id = ? ORDER BY sort_order ASC
      `).all(session.id);

      return {
        ...session,
        charts: charts.map(chart => ({
          id: chart.id,
          type: chart.type,
          title: chart.title,
          explanation: chart.explanation,
          x_axis_label: chart.x_axis_label,
          y_axis_label: chart.y_axis_label,
          chart_data: JSON.parse(chart.chart_data),
          sort_order: chart.sort_order
        }))
      };
    });
  },

  deleteSession(id) {
    const db = getDb();
    return db.prepare('DELETE FROM insight_sessions WHERE id = ?').run(id);
  }
};

module.exports = insightsRepository;
