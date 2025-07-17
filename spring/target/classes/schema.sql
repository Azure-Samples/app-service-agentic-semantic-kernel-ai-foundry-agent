CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE
);

-- Insert some sample data
INSERT INTO tasks (title, is_complete) VALUES 
('Sample Task 1', false),
('Sample Task 2', true),
('Learn Spring WebFlux', false);
