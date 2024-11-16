#!/bin/bash

# Clear the screen
tput clear

# Trap Ctrl+C
trap ctrl_c INT

# Function to handle Ctrl+C
function ctrl_c() {
    echo "** You pressed Ctrl+C... Exiting"
    exit 0
}

echo "###############################################"
echo "###############################################"
echo "###############################################"
echo "_    _                 _          _ _ _   "
echo "| |  (_)_ _ _  ___ __  /_\ _  _ __| (_) |_ "
echo "| |__| |   \ || \ \ / / _ \ || / _  | |  _|"
echo "|____|_|_||_\_ _/_\_\/_/ \_\_ _\__ _|_|\__|"
echo
echo "###############################################"
echo "Welcome to security audit of your Linux machine:"
echo "###############################################"
echo
echo "The script will automatically gather the required information."
echo "The checklist can help you in the process of hardening your system."
echo "Note: It has been tested for Ubuntu Linux Distro."
echo
sleep 3
echo

# Prompt for saving output
while true; do
    read -p "Would you like to save the output? [Y/N] " output
    case "${output^^}" in
        Y)
            read -p "Please enter the path to save the output (e.g., /path_to_save/LinuxAudit.txt): " path
            echo "File will be saved to $path/LinuxAudit.txt"
            break
            ;;
        N)
            echo "OK, not saving. Moving on."
            break
            ;;
        *)
            echo "Invalid input. Please enter Y or N."
            ;;
    esac
done

echo
echo "OK... $HOSTNAME ...let's continue, please wait for it to finish:"
echo
sleep 3
echo
echo "Script Starts ;)"
START=$(date +%s)
echo

# Function to perform audit and write to file
perform_audit() {
    # Kernel Information
    echo -e "\e[0;33m 1. Linux Kernel Information \e[0m"
    uname -a
    echo "###############################################"

    # Current User and ID Information
    echo -e "\e[0;33m 2. Current User and ID Information \e[0m"
    whoami
    id
    echo "###############################################"

    # Linux Distribution Information
    echo -e "\e[0;33m 3. Linux Distribution Information \e[0m"
    lsb_release -a
    echo "###############################################"

    # List Current Logged In Users
    echo -e "\e[0;33m 4. List Current Logged In Users \e[0m"
    w
    echo "###############################################"

    # Uptime Information
    echo -e "\e[0;33m 5. Uptime Information \e[0m"
    uptime
    echo "###############################################"

    # Running Services
    echo -e "\e[0;33m 6. Running Services \e[0m"
    service --status-all | grep "+"
    echo "###############################################"

    # TODO
    # Active Internet Connections and Open Ports
    echo -e "\e[0;33m 7. Active Internet Connections and Open Ports \e[0m"
    netstat -natp
    echo "###############################################"

    # Available Disk Space
    echo -e "\e[0;33m 8. Available Disk Space \e[0m"
    df -h
    echo "###############################################"

    # Memory Usage
    echo -e "\e[0;33m 9. Memory Usage \e[0m"
    free -h
    echo "###############################################"

    # TODO
    # Command History
    echo -e "\e[0;33m 10. Command History \e[0m"
    history
    echo "###############################################"

    # TODO
    # Network Interfaces
    echo -e "\e[0;33m 11. Network Interfaces \e[0m"
    ifconfig -a
    echo "###############################################"

    # IPtables Information
    echo -e "\e[0;33m 12. IPtables Information \e[0m"
    iptables -L -n -v
    echo "###############################################"

    # Running Processes
    echo -e "\e[0;33m 13. Running Processes \e[0m"
    ps -a
    echo "###############################################"

    # TODO
    # SSH Configuration
    echo -e "\e[0;33m 14. SSH Configuration \e[0m"
    cat /etc/ssh/sshd_config
    echo "###############################################"

    # List Installed Packages
    # echo -e "\e[0;33m 15. List Installed Packages \e[0m"
    # apt-cache pkgnames
    # echo "###############################################"

    # Network Parameters
    echo -e "\e[0;33m 16. Network Parameters \e[0m"
    cat /etc/sysctl.conf
    echo "###############################################"

    # Password Policies
    echo -e "\e[0;33m 17. Password Policies \e[0m"
    cat /etc/pam.d/common-password
    echo "###############################################"

    # Source List File
    echo -e "\e[0;33m 18. Source List File \e[0m"
    cat /etc/apt/sources.list
    echo "###############################################"

    # Check for Broken Dependencies
    echo -e "\e[0;33m 19. Check for Broken Dependencies \e[0m"
    apt-get check
    echo "###############################################"

    # TODO
    # MOTD Banner Message
    echo -e "\e[0;33m 20. MOTD Banner Message \e[0m"
    cat /etc/motd
    echo "###############################################"

    # List User Names
    echo -e "\e[0;33m 21. List User Names \e[0m"
    cut -d: -f1 /etc/passwd
    echo "###############################################"

    # TODO
    # Check for Null Passwords
    echo -e "\e[0;33m 22. Check for Null Passwords \e[0m"
    users="$(cut -d: -f 1 /etc/passwd)"
    for x in $users; do
        passwd -S $x | grep "NP"
    done
    echo "###############################################"

    # TODO
    # IP Routing Table
    echo -e "\e[0;33m 23. IP Routing Table \e[0m"
    route
    echo "###############################################"

    # Kernel Messages
    echo -e "\e[0;33m 24. Kernel Messages \e[0m"
    dmesg
    echo "###############################################"

    # Check Upgradable Packages
    echo -e "\e[0;33m 25. Check Upgradable Packages \e[0m"
    apt list --upgradeable
    echo "###############################################"

    # CPU/System Information
    echo -e "\e[0;33m 26. CPU/System Information \e[0m"
    cat /proc/cpuinfo
    echo "###############################################"

    # TCP Wrappers
    echo -e "\e[0;33m 27. TCP Wrappers \e[0m"
    echo "hosts.allow:"
    cat /etc/hosts.allow
    echo "hosts.deny:"
    cat /etc/hosts.deny
    echo "###############################################"

    # TODO
    # Failed Login Attempts
    echo -e "\e[0;33m 28. Failed Login Attempts \e[0m"
    grep --color "failure" /var/log/auth.log
    echo "###############################################"
}

# Execute the audit and save to file if requested
if [[ "${output^^}" == "Y" ]]; then
    perform_audit > "$path/LinuxAudit.txt"
else
    perform_audit
fi

echo
echo "###############################################"
echo
END=$(date +%s)
DIFF=$((END - START))
echo "Script completed in $DIFF seconds."
echo
echo "Executed on:"
date
echo

exit 0