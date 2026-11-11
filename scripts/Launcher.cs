using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PharmaInvent
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string electronExe = Path.Combine(appDir, "node_modules", "electron", "dist", "electron.exe");
            string mainJs = Path.Combine(appDir, "desktop", "main.js");

            if (!File.Exists(electronExe) || !File.Exists(mainJs))
            {
                MessageBox.Show(
                    "Pharma Invent components are missing. Please ensure node_modules and desktop/main.js are present.",
                    "Pharma Invent Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = electronExe;
            psi.Arguments = "\"" + mainJs + "\"";
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;

            try
            {
                using (Process proc = Process.Start(psi))
                {
                    proc.WaitForExit();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Unable to launch Pharma Invent:\n" + ex.Message,
                    "Pharma Invent Launch Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
