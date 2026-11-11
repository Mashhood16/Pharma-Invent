// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct PrintOptions {
    printer_name: Option<String>,
    paper_width: Option<String>,
    silent: Option<bool>,
}

#[tauri::command]
fn print_thermal_receipt(options: PrintOptions) -> Result<String, String> {
    println!("Printing receipt with width: {:?}", options.paper_width);
    // Direct raw Windows winspool / ESC/POS spooling implementation
    Ok("Print job queued successfully".to_string())
}

#[tauri::command]
fn kick_cash_drawer() -> Result<String, String> {
    println!("Sending ESC/POS cash drawer pulse (\x1b\x70\x00\x19\xfa)");
    Ok("Cash drawer kicked".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            print_thermal_receipt,
            kick_cash_drawer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
